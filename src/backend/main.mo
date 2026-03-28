import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import List "mo:core/List";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Timer "mo:core/Timer";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  let SUPER_ADMIN_EMAIL : Text = "mdsaddamislamic@gmail.com";

  type PostId = Text;
  type CommentId = Text;
  type NotificationId = Text;
  type ChatMessageId = Text;

  public type UserStatus = { #pending; #approved; #rejected; #blocked };
  public type UserAdminRole = { #none; #helperAdmin; #superAdmin };

  public type UserProfile = {
    username : Text;
    bio : Text;
    profilePhotoId : ?Storage.ExternalBlob;
    coverPhotoId : ?Storage.ExternalBlob;
  };

  public type AdminUserView = {
    principal : Principal;
    profile : UserProfile;
    email : Text;
    status : UserStatus;
    adminRole : UserAdminRole;
    signupDate : Time.Time;
  };

  public type CommentView = {
    id : CommentId;
    postId : PostId;
    author : Principal;
    content : Text;
    createdTimestamp : Time.Time;
    replies : [CommentView];
  };

  public type PostView = {
    id : PostId;
    author : Principal;
    content : Text;
    imageBlobId : ?Storage.ExternalBlob;
    createdTimestamp : Time.Time;
    comments : [CommentView];
    likes : [Principal];
  };

  public type NotificationType = { #like; #comment; };

  public type NotificationView = {
    id : NotificationId;
    recipientPrincipal : Principal;
    senderPrincipal : Principal;
    notifType : NotificationType;
    postId : PostId;
    message : Text;
    isRead : Bool;
    createdTimestamp : Time.Time;
  };

  public type ChatMessageView = {
    id : ChatMessageId;
    sender : Principal;
    content : Text;
    createdTimestamp : Time.Time;
    recipient : ?Principal;
    imageBlobId : ?Storage.ExternalBlob;
  };

  type Notification = {
    id : NotificationId;
    recipientPrincipal : Principal;
    senderPrincipal : Principal;
    notifType : NotificationType;
    postId : PostId;
    message : Text;
    isRead : Bool;
    createdTimestamp : Time.Time;
  };

  type Comment = {
    id : CommentId;
    postId : PostId;
    author : Principal;
    content : Text;
    createdTimestamp : Time.Time;
    replies : List.List<Comment>;
  };

  type Post = {
    id : PostId;
    author : Principal;
    content : Text;
    imageBlobId : ?Storage.ExternalBlob;
    createdTimestamp : Time.Time;
    comments : List.List<Comment>;
    likes : Set.Set<Principal>;
  };

  type ChatMessage = {
    id : ChatMessageId;
    sender : Principal;
    content : Text;
    createdTimestamp : Time.Time;
    recipient : ?Principal;
  };

  let profiles = Map.empty<Principal, UserProfile>();
  let posts = Map.empty<PostId, Post>();
  let notifications = Map.empty<NotificationId, Notification>();
  let chatMessages = Map.empty<ChatMessageId, ChatMessage>();
  let chatMessageImages = Map.empty<ChatMessageId, Storage.ExternalBlob>();
  let userStatuses = Map.empty<Principal, UserStatus>();
  let userAdminRoles = Map.empty<Principal, UserAdminRole>();
  let userSignupDates = Map.empty<Principal, Time.Time>();
  let userEmails = Map.empty<Principal, Text>();
  let emailToPrincipal = Map.empty<Text, Principal>();
  var nextPostId = 0;
  var nextCommentId = 0;
  var nextNotificationId = 0;
  var nextChatMessageId = 0;

  let lifetimeThreshold = 30 * 24 * 60 * 60 * 1_000_000_000;

  func isRejectedStatus(status : UserStatus) : Bool {
    switch (status) {
      case (#rejected) { true };
      case (_) { false };
    };
  };

  func isSuperAdminPrincipal(p : Principal) : Bool {
    switch (userEmails.get(p)) {
      case (?email) { email == SUPER_ADMIN_EMAIL };
      case (null) { false };
    };
  };

  func isAdminPrincipal(p : Principal) : Bool {
    if (isSuperAdminPrincipal(p)) { return true };
    switch (userAdminRoles.get(p)) {
      case (?#helperAdmin) { true };
      case (_) { false };
    };
  };

  func comparePostsDesc(a : Post, b : Post) : Order.Order {
    if (a.createdTimestamp > b.createdTimestamp) { #less }
    else if (a.createdTimestamp < b.createdTimestamp) { #greater }
    else { #equal };
  };

  func compareNotifDesc(a : Notification, b : Notification) : Order.Order {
    if (a.createdTimestamp > b.createdTimestamp) { #less }
    else if (a.createdTimestamp < b.createdTimestamp) { #greater }
    else { #equal };
  };

  func compareChatDesc(a : ChatMessage, b : ChatMessage) : Order.Order {
    if (a.createdTimestamp > b.createdTimestamp) { #less }
    else if (a.createdTimestamp < b.createdTimestamp) { #greater }
    else { #equal };
  };

  func commentToView(c : Comment) : CommentView {
    { id = c.id; postId = c.postId; author = c.author; content = c.content;
      createdTimestamp = c.createdTimestamp;
      replies = c.replies.toArray().map(commentToView); };
  };

  func postToView(p : Post) : PostView {
    { id = p.id; author = p.author; content = p.content;
      imageBlobId = p.imageBlobId; createdTimestamp = p.createdTimestamp;
      comments = p.comments.toArray().map(commentToView);
      likes = p.likes.toArray(); };
  };

  func chatToView(m : ChatMessage) : ChatMessageView {
    { id = m.id; sender = m.sender; content = m.content;
      createdTimestamp = m.createdTimestamp; recipient = m.recipient;
      imageBlobId = chatMessageImages.get(m.id); };
  };

  // ── Check if email is registered (no auth required) ───────────────────────
  public query func emailExists(email : Text) : async Bool {
    emailToPrincipal.get(email) != null
  };

  // ── Reset password by transferring profile to new principal ───────────────
  // Caller = new identity derived from email + new password.
  // No auth check: new principal is not registered yet.
  // Works for all users including Super Admin.
  public shared ({ caller }) func resetPasswordForEmail(email : Text) : async () {
    switch (emailToPrincipal.get(email)) {
      case (null) { Runtime.trap("Email not registered") };
      case (?oldPrincipal) {
        // Same principal = same password, nothing to do
        if (oldPrincipal == caller) { return };
        // Transfer access control role to new principal
        switch (accessControlState.userRoles.get(oldPrincipal)) {
          case (?r) { accessControlState.userRoles.add(caller, r) };
          case (null) { accessControlState.userRoles.add(caller, #user) };
        };
        // Transfer profile
        switch (profiles.get(oldPrincipal)) {
          case (?p) { profiles.add(caller, p) };
          case (null) {};
        };
        // Transfer status
        switch (userStatuses.get(oldPrincipal)) {
          case (?s) { userStatuses.add(caller, s) };
          case (null) {};
        };
        // Transfer admin role
        switch (userAdminRoles.get(oldPrincipal)) {
          case (?r) { userAdminRoles.add(caller, r) };
          case (null) {};
        };
        // Transfer signup date
        switch (userSignupDates.get(oldPrincipal)) {
          case (?d) { userSignupDates.add(caller, d) };
          case (null) {};
        };
        // Update email maps
        userEmails.add(caller, email);
        emailToPrincipal.add(email, caller);
        // Remove old principal data
        accessControlState.userRoles.remove(oldPrincipal);
        profiles.remove(oldPrincipal);
        userStatuses.remove(oldPrincipal);
        userAdminRoles.remove(oldPrincipal);
        userSignupDates.remove(oldPrincipal);
        userEmails.remove(oldPrincipal);
      };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    profiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    if (userSignupDates.get(caller) == null) {
      userSignupDates.add(caller, Time.now());
    };
    profiles.add(caller, profile);
  };

  public shared ({ caller }) func saveCallerEmail(email : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (emailToPrincipal.get(email)) {
      case (?existingPrincipal) {
        if (existingPrincipal != caller) {
          let existingStatus = switch (userStatuses.get(existingPrincipal)) {
            case (?s) { s };
            case (null) { #pending };
          };
          if (isRejectedStatus(existingStatus)) {
            profiles.remove(existingPrincipal);
            userStatuses.remove(existingPrincipal);
            userAdminRoles.remove(existingPrincipal);
            userSignupDates.remove(existingPrincipal);
            userEmails.remove(existingPrincipal);
            emailToPrincipal.remove(email);
          } else {
            Runtime.trap("Ye email already registered hai, please login karein");
          };
        };
      };
      case (null) {};
    };
    emailToPrincipal.add(email, caller);
    userEmails.add(caller, email);
    if (email == SUPER_ADMIN_EMAIL) {
      userStatuses.add(caller, #approved);
      userAdminRoles.add(caller, #superAdmin);
    } else {
      switch (userStatuses.get(caller)) {
        case (null) { userStatuses.add(caller, #pending) };
        case (?#rejected) { userStatuses.add(caller, #pending) };
        case (_) {};
      };
    };
  };

  public query ({ caller }) func getCallerEmail() : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userEmails.get(caller);
  };

  public query ({ caller }) func getCallerStatus() : async UserStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (isSuperAdminPrincipal(caller)) { return #approved };
    switch (userStatuses.get(caller)) {
      case (?s) { s };
      case (null) { #pending };
    };
  };

  public query ({ caller }) func isSuperAdmin() : async Bool {
    isSuperAdminPrincipal(caller);
  };

  public query ({ caller }) func getCallerAdminRole() : async UserAdminRole {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (isSuperAdminPrincipal(caller)) { return #superAdmin };
    switch (userAdminRoles.get(caller)) {
      case (?r) { r };
      case (null) { #none };
    };
  };

  public query ({ caller }) func getAllUsersAdminView() : async [AdminUserView] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can view all users");
    };
    let result = List.empty<AdminUserView>();
    for ((p, profile) in profiles.toArray().values()) {
      let email = switch (userEmails.get(p)) {
        case (?e) { e };
        case (null) { "" };
      };
      let status = switch (userStatuses.get(p)) {
        case (?s) { s };
        case (null) { #pending };
      };
      let adminRole = if (email == SUPER_ADMIN_EMAIL) { #superAdmin } else {
        switch (userAdminRoles.get(p)) {
          case (?r) { r };
          case (null) { #none };
        };
      };
      let signupDate = switch (userSignupDates.get(p)) {
        case (?d) { d };
        case (null) { 0 };
      };
      result.add({ principal = p; profile; email; status; adminRole; signupDate });
    };
    result.toArray();
  };

  public shared ({ caller }) func updateUserStatus(user : Principal, status : UserStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can update user status");
    };
    if (isSuperAdminPrincipal(user)) {
      Runtime.trap("Cannot change super admin status");
    };
    userStatuses.add(user, status);
  };

  public shared ({ caller }) func setHelperAdmin(user : Principal, isHelper : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (not isSuperAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only super admin can manage helper admins");
    };
    if (isSuperAdminPrincipal(user)) {
      Runtime.trap("Cannot change super admin role");
    };
    if (isHelper) {
      userAdminRoles.add(user, #helperAdmin);
    } else {
      userAdminRoles.add(user, #none);
    };
  };

  public shared ({ caller }) func cleanupIncompleteUsers() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can cleanup database");
    };
    var count : Nat = 0;
    let toRemove = profiles.keys().toArray().filter(func(p : Principal) : Bool {
      userEmails.get(p) == null
    });
    for (p in toRemove.values()) {
      profiles.remove(p);
      userStatuses.remove(p);
      userAdminRoles.remove(p);
      userSignupDates.remove(p);
      count += 1;
    };
    count
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    profiles.get(user);
  };

  public query ({ caller }) func getProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    profiles.get(user);
  };

  public query ({ caller }) func getAllUsers() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view user list");
    };
    profiles.keys().toArray();
  };

  public shared ({ caller }) func createPost(content : Text, imageBlobId : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create posts");
    };
    let post : Post = {
      id = nextPostId.toText(); author = caller; content; imageBlobId;
      createdTimestamp = Time.now();
      comments = List.empty<Comment>();
      likes = Set.empty<Principal>();
    };
    posts.add(post.id, post);
    nextPostId += 1;
  };

  public shared ({ caller }) func likePost(postId : PostId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like posts");
    };
    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        if (post.likes.contains(caller)) { Runtime.trap("Already liked") };
        post.likes.add(caller);
        if (caller != post.author) {
          let n : Notification = {
            id = nextNotificationId.toText();
            recipientPrincipal = post.author; senderPrincipal = caller;
            notifType = #like; postId;
            message = "Someone liked your post";
            isRead = false; createdTimestamp = Time.now();
          };
          notifications.add(n.id, n);
          nextNotificationId += 1;
        };
      };
    };
  };

  public shared ({ caller }) func unlikePost(postId : PostId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike posts");
    };
    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) { post.likes.remove(caller) };
    };
  };

  public shared ({ caller }) func addComment(postId : PostId, content : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can comment");
    };
    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        let comment : Comment = {
          id = nextCommentId.toText(); postId; author = caller; content;
          createdTimestamp = Time.now();
          replies = List.empty<Comment>();
        };
        post.comments.add(comment);
        nextCommentId += 1;
        if (caller != post.author) {
          let n : Notification = {
            id = nextNotificationId.toText();
            recipientPrincipal = post.author; senderPrincipal = caller;
            notifType = #comment; postId;
            message = "Someone commented on your post";
            isRead = false; createdTimestamp = Time.now();
          };
          notifications.add(n.id, n);
          nextNotificationId += 1;
        };
      };
    };
  };

  public shared ({ caller }) func replyToComment(postId : PostId, commentId : CommentId, content : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can reply to comments");
    };
    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        let commentOpt = post.comments.find(func(c) { c.id == commentId });
        switch (commentOpt) {
          case (null) { Runtime.trap("Comment not found") };
          case (?comment) {
            let reply : Comment = {
              id = nextCommentId.toText(); postId; author = caller; content;
              createdTimestamp = Time.now();
              replies = List.empty<Comment>();
            };
            comment.replies.add(reply);
            nextCommentId += 1;
          };
        };
      };
    };
  };

  public query ({ caller }) func getFeed(page : Nat, pageSize : Nat) : async [PostView] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view feed");
    };
    let sorted = posts.values().toArray().sort(comparePostsDesc);
    let start = page * pageSize;
    if (start >= sorted.size()) { return [] };
    let end = if (start + pageSize > sorted.size()) { sorted.size() } else { start + pageSize };
    sorted.sliceToArray(start, end).map(postToView);
  };

  public query ({ caller }) func getUserPosts(user : Principal, page : Nat, pageSize : Nat) : async [PostView] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view posts");
    };
    let filtered = posts.values().toArray().filter(func(p) { p.author == user });
    let sorted = filtered.sort(comparePostsDesc);
    let start = page * pageSize;
    if (start >= sorted.size()) { return [] };
    let end = if (start + pageSize > sorted.size()) { sorted.size() } else { start + pageSize };
    sorted.sliceToArray(start, end).map(postToView);
  };

  public query ({ caller }) func getMyNotifications() : async [NotificationView] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notifications");
    };
    let mine = notifications.values().toArray().filter(func(n) { n.recipientPrincipal == caller });
    mine.sort(compareNotifDesc).map(func(n) : NotificationView {
      { id = n.id; recipientPrincipal = n.recipientPrincipal;
        senderPrincipal = n.senderPrincipal; notifType = n.notifType;
        postId = n.postId; message = n.message; isRead = n.isRead;
        createdTimestamp = n.createdTimestamp; };
    });
  };

  public shared ({ caller }) func markNotificationRead(notifId : NotificationId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications");
    };
    switch (notifications.get(notifId)) {
      case (null) { Runtime.trap("Notification not found") };
      case (?n) {
        if (n.recipientPrincipal != caller) {
          Runtime.trap("Unauthorized: Can only mark your own notifications as read")
        };
        notifications.add(notifId, { n with isRead = true });
      };
    };
  };

  public shared ({ caller }) func markAllNotificationsRead() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications");
    };
    let mine = notifications.toArray().filter(func((_, n)) { n.recipientPrincipal == caller });
    for ((id, n) in mine.values()) {
      notifications.add(id, { n with isRead = true });
    };
  };

  public shared ({ caller }) func sendGroupMessage(content : Text, imageBlobId : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };
    let msgId = nextChatMessageId.toText();
    let msg : ChatMessage = {
      id = msgId; sender = caller; content;
      createdTimestamp = Time.now(); recipient = null;
    };
    chatMessages.add(msg.id, msg);
    switch (imageBlobId) {
      case (?img) { chatMessageImages.add(msgId, img) };
      case null {};
    };
    nextChatMessageId += 1;
  };

  public shared ({ caller }) func sendPrivateMessage(recipient : Principal, content : Text, imageBlobId : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };
    let msgId = nextChatMessageId.toText();
    let msg : ChatMessage = {
      id = msgId; sender = caller; content;
      createdTimestamp = Time.now(); recipient = ?recipient;
    };
    chatMessages.add(msg.id, msg);
    switch (imageBlobId) {
      case (?img) { chatMessageImages.add(msgId, img) };
      case null {};
    };
    nextChatMessageId += 1;
  };

  public query ({ caller }) func getGroupMessages(page : Nat, pageSize : Nat) : async [ChatMessageView] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };
    let group = chatMessages.values().toArray().filter(func(m) { m.recipient == null });
    let sorted = group.sort(compareChatDesc);
    let start = page * pageSize;
    if (start >= sorted.size()) { return [] };
    let end = if (start + pageSize > sorted.size()) { sorted.size() } else { start + pageSize };
    sorted.sliceToArray(start, end).map(chatToView);
  };

  public query ({ caller }) func getPrivateMessages(other : Principal, page : Nat, pageSize : Nat) : async [ChatMessageView] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };
    let conv = chatMessages.values().toArray().filter(func(m) {
      switch (m.recipient) {
        case (null) { false };
        case (?r) {
          (m.sender == caller and r == other) or
          (m.sender == other and r == caller)
        };
      };
    });
    let sorted = conv.sort(compareChatDesc);
    let start = page * pageSize;
    if (start >= sorted.size()) { return [] };
    let end = if (start + pageSize > sorted.size()) { sorted.size() } else { start + pageSize };
    sorted.sliceToArray(start, end).map(chatToView);
  };

  func cleanupExpired() : async () {
    let now = Time.now();
    let expiredPosts = posts.toArray().filter(func((_, p)) { (now - p.createdTimestamp) > lifetimeThreshold });
    for ((id, _) in expiredPosts.values()) { posts.remove(id) };
    let expiredMsgs = chatMessages.toArray().filter(func((_, m)) { (now - m.createdTimestamp) > lifetimeThreshold });
    for ((id, _) in expiredMsgs.values()) { chatMessages.remove(id) };
  };

  public shared ({ caller }) func deleteExpiredPosts() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete expired posts");
    };
    await cleanupExpired();
  };

  public shared ({ caller }) func startAutoDeleteTimer() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can start auto-delete timer");
    };
    ignore Timer.recurringTimer<system>(
      #seconds(86400),
      func() : async () { await cleanupExpired() },
    );
  };
};
