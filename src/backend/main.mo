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

  type PostId = Text;
  type CommentId = Text;
  type NotificationId = Text;
  type ChatMessageId = Text;

  public type UserProfile = {
    username : Text;
    bio : Text;
    profilePhotoId : ?Storage.ExternalBlob;
    coverPhotoId : ?Storage.ExternalBlob;
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
    // For private messages: the other participant
    recipient : ?Principal;
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
    recipient : ?Principal; // null = group chat, Some = private
  };

  let profiles = Map.empty<Principal, UserProfile>();
  let posts = Map.empty<PostId, Post>();
  let notifications = Map.empty<NotificationId, Notification>();
  let chatMessages = Map.empty<ChatMessageId, ChatMessage>();
  var nextPostId = 0;
  var nextCommentId = 0;
  var nextNotificationId = 0;
  var nextChatMessageId = 0;

  let lifetimeThreshold = 30 * 24 * 60 * 60 * 1_000_000_000; // 30 days

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
      createdTimestamp = m.createdTimestamp; recipient = m.recipient; };
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
    profiles.add(caller, profile);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile unless admin");
    };
    profiles.get(user);
  };

  public query ({ caller }) func getProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile unless admin");
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

  // Chat: send group message
  public shared ({ caller }) func sendGroupMessage(content : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };
    let msg : ChatMessage = {
      id = nextChatMessageId.toText(); sender = caller; content;
      createdTimestamp = Time.now(); recipient = null;
    };
    chatMessages.add(msg.id, msg);
    nextChatMessageId += 1;
  };

  // Chat: send private message
  public shared ({ caller }) func sendPrivateMessage(recipient : Principal, content : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };
    let msg : ChatMessage = {
      id = nextChatMessageId.toText(); sender = caller; content;
      createdTimestamp = Time.now(); recipient = ?recipient;
    };
    chatMessages.add(msg.id, msg);
    nextChatMessageId += 1;
  };

  // Chat: get group messages
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

  // Chat: get private messages between caller and another user
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
