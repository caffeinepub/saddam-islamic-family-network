/* eslint-disable */
// @ts-nocheck
import { IDL } from '@icp-sdk/core/candid';

export const CommentView = IDL.Rec();
export const _CaffeineStorageCreateCertificateResult = IDL.Record({ 'method': IDL.Text, 'blob_hash': IDL.Text });
export const _CaffeineStorageRefillInformation = IDL.Record({ 'proposed_top_up_amount': IDL.Opt(IDL.Nat) });
export const _CaffeineStorageRefillResult = IDL.Record({ 'success': IDL.Opt(IDL.Bool), 'topped_up_amount': IDL.Opt(IDL.Nat) });
export const PostId = IDL.Text;
export const UserRole = IDL.Variant({ 'admin': IDL.Null, 'user': IDL.Null, 'guest': IDL.Null });
export const UserStatus = IDL.Variant({ 'pending': IDL.Null, 'approved': IDL.Null, 'rejected': IDL.Null, 'blocked': IDL.Null });
export const UserAdminRole = IDL.Variant({ 'none': IDL.Null, 'helperAdmin': IDL.Null, 'superAdmin': IDL.Null });
export const ExternalBlob = IDL.Vec(IDL.Nat8);
export const UserProfile = IDL.Record({
  'bio': IDL.Text,
  'username': IDL.Text,
  'profilePhotoId': IDL.Opt(ExternalBlob),
  'coverPhotoId': IDL.Opt(ExternalBlob),
});
export const AdminUserView = IDL.Record({
  'principal': IDL.Principal,
  'profile': UserProfile,
  'email': IDL.Text,
  'status': UserStatus,
  'adminRole': UserAdminRole,
  'signupDate': IDL.Int,
});
export const Time = IDL.Int;
export const CommentId = IDL.Text;
CommentView.fill(IDL.Record({
  'id': CommentId, 'content': IDL.Text, 'author': IDL.Principal,
  'createdTimestamp': Time, 'replies': IDL.Vec(CommentView), 'postId': PostId,
}));
export const PostView = IDL.Record({
  'id': PostId, 'content': IDL.Text, 'author': IDL.Principal,
  'likes': IDL.Vec(IDL.Principal), 'createdTimestamp': Time,
  'comments': IDL.Vec(CommentView), 'imageBlobId': IDL.Opt(ExternalBlob),
});
export const ChatMessageId = IDL.Text;
export const ChatMessageView = IDL.Record({
  'id': ChatMessageId, 'content': IDL.Text, 'recipient': IDL.Opt(IDL.Principal),
  'sender': IDL.Principal, 'createdTimestamp': Time,
});
export const NotificationId = IDL.Text;
export const NotificationType = IDL.Variant({ 'like': IDL.Null, 'comment': IDL.Null });
export const NotificationView = IDL.Record({
  'id': NotificationId, 'notifType': NotificationType, 'isRead': IDL.Bool,
  'senderPrincipal': IDL.Principal, 'message': IDL.Text,
  'createdTimestamp': Time, 'recipientPrincipal': IDL.Principal, 'postId': PostId,
});

export const idlService = IDL.Service({
  '_caffeineStorageBlobIsLive': IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Bool], ['query']),
  '_caffeineStorageBlobsToDelete': IDL.Func([], [IDL.Vec(IDL.Vec(IDL.Nat8))], ['query']),
  '_caffeineStorageConfirmBlobDeletion': IDL.Func([IDL.Vec(IDL.Vec(IDL.Nat8))], [], []),
  '_caffeineStorageCreateCertificate': IDL.Func([IDL.Text], [_CaffeineStorageCreateCertificateResult], []),
  '_caffeineStorageRefillCashier': IDL.Func([IDL.Opt(_CaffeineStorageRefillInformation)], [_CaffeineStorageRefillResult], []),
  '_caffeineStorageUpdateGatewayPrincipals': IDL.Func([], [], []),
  '_initializeAccessControlWithSecret': IDL.Func([IDL.Text], [], []),
  'addComment': IDL.Func([PostId, IDL.Text], [], []),
  'assignCallerUserRole': IDL.Func([IDL.Principal, UserRole], [], []),
  'createPost': IDL.Func([IDL.Text, IDL.Opt(ExternalBlob)], [], []),
  'deleteExpiredPosts': IDL.Func([], [], []),
  'getAllUsers': IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
  'getAllUsersAdminView': IDL.Func([], [IDL.Vec(AdminUserView)], ['query']),
  'getCallerAdminRole': IDL.Func([], [UserAdminRole], ['query']),
  'getCallerEmail': IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
  'getCallerStatus': IDL.Func([], [UserStatus], ['query']),
  'getCallerUserProfile': IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
  'getCallerUserRole': IDL.Func([], [UserRole], ['query']),
  'getFeed': IDL.Func([IDL.Nat, IDL.Nat], [IDL.Vec(PostView)], ['query']),
  'getGroupMessages': IDL.Func([IDL.Nat, IDL.Nat], [IDL.Vec(ChatMessageView)], ['query']),
  'getMyNotifications': IDL.Func([], [IDL.Vec(NotificationView)], ['query']),
  'getPrivateMessages': IDL.Func([IDL.Principal, IDL.Nat, IDL.Nat], [IDL.Vec(ChatMessageView)], ['query']),
  'getProfile': IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
  'getUserPosts': IDL.Func([IDL.Principal, IDL.Nat, IDL.Nat], [IDL.Vec(PostView)], ['query']),
  'getUserProfile': IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
  'isCallerAdmin': IDL.Func([], [IDL.Bool], ['query']),
  'isSuperAdmin': IDL.Func([], [IDL.Bool], ['query']),
  'likePost': IDL.Func([PostId], [], []),
  'markAllNotificationsRead': IDL.Func([], [], []),
  'markNotificationRead': IDL.Func([NotificationId], [], []),
  'replyToComment': IDL.Func([PostId, CommentId, IDL.Text], [], []),
  'saveCallerEmail': IDL.Func([IDL.Text], [], []),
  'saveCallerUserProfile': IDL.Func([UserProfile], [], []),
  'sendGroupMessage': IDL.Func([IDL.Text], [], []),
  'sendPrivateMessage': IDL.Func([IDL.Principal, IDL.Text], [], []),
  'setHelperAdmin': IDL.Func([IDL.Principal, IDL.Bool], [], []),
  'startAutoDeleteTimer': IDL.Func([], [], []),
  'unlikePost': IDL.Func([PostId], [], []),
  'updateUserStatus': IDL.Func([IDL.Principal, UserStatus], [], []),
});

export const idlInitArgs = [];

export const idlFactory = ({ IDL }) => {
  const CommentView = IDL.Rec();
  const _CaffeineStorageCreateCertificateResult = IDL.Record({ 'method': IDL.Text, 'blob_hash': IDL.Text });
  const _CaffeineStorageRefillInformation = IDL.Record({ 'proposed_top_up_amount': IDL.Opt(IDL.Nat) });
  const _CaffeineStorageRefillResult = IDL.Record({ 'success': IDL.Opt(IDL.Bool), 'topped_up_amount': IDL.Opt(IDL.Nat) });
  const PostId = IDL.Text;
  const UserRole = IDL.Variant({ 'admin': IDL.Null, 'user': IDL.Null, 'guest': IDL.Null });
  const UserStatus = IDL.Variant({ 'pending': IDL.Null, 'approved': IDL.Null, 'rejected': IDL.Null, 'blocked': IDL.Null });
  const UserAdminRole = IDL.Variant({ 'none': IDL.Null, 'helperAdmin': IDL.Null, 'superAdmin': IDL.Null });
  const ExternalBlob = IDL.Vec(IDL.Nat8);
  const UserProfile = IDL.Record({
    'bio': IDL.Text, 'username': IDL.Text,
    'profilePhotoId': IDL.Opt(ExternalBlob), 'coverPhotoId': IDL.Opt(ExternalBlob),
  });
  const AdminUserView = IDL.Record({
    'principal': IDL.Principal, 'profile': UserProfile, 'email': IDL.Text,
    'status': UserStatus, 'adminRole': UserAdminRole, 'signupDate': IDL.Int,
  });
  const Time = IDL.Int;
  const CommentId = IDL.Text;
  CommentView.fill(IDL.Record({
    'id': CommentId, 'content': IDL.Text, 'author': IDL.Principal,
    'createdTimestamp': Time, 'replies': IDL.Vec(CommentView), 'postId': PostId,
  }));
  const PostView = IDL.Record({
    'id': PostId, 'content': IDL.Text, 'author': IDL.Principal,
    'likes': IDL.Vec(IDL.Principal), 'createdTimestamp': Time,
    'comments': IDL.Vec(CommentView), 'imageBlobId': IDL.Opt(ExternalBlob),
  });
  const ChatMessageId = IDL.Text;
  const ChatMessageView = IDL.Record({
    'id': ChatMessageId, 'content': IDL.Text, 'recipient': IDL.Opt(IDL.Principal),
    'sender': IDL.Principal, 'createdTimestamp': Time,
  });
  const NotificationId = IDL.Text;
  const NotificationType = IDL.Variant({ 'like': IDL.Null, 'comment': IDL.Null });
  const NotificationView = IDL.Record({
    'id': NotificationId, 'notifType': NotificationType, 'isRead': IDL.Bool,
    'senderPrincipal': IDL.Principal, 'message': IDL.Text,
    'createdTimestamp': Time, 'recipientPrincipal': IDL.Principal, 'postId': PostId,
  });
  return IDL.Service({
    '_caffeineStorageBlobIsLive': IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Bool], ['query']),
    '_caffeineStorageBlobsToDelete': IDL.Func([], [IDL.Vec(IDL.Vec(IDL.Nat8))], ['query']),
    '_caffeineStorageConfirmBlobDeletion': IDL.Func([IDL.Vec(IDL.Vec(IDL.Nat8))], [], []),
    '_caffeineStorageCreateCertificate': IDL.Func([IDL.Text], [_CaffeineStorageCreateCertificateResult], []),
    '_caffeineStorageRefillCashier': IDL.Func([IDL.Opt(_CaffeineStorageRefillInformation)], [_CaffeineStorageRefillResult], []),
    '_caffeineStorageUpdateGatewayPrincipals': IDL.Func([], [], []),
    '_initializeAccessControlWithSecret': IDL.Func([IDL.Text], [], []),
    'addComment': IDL.Func([PostId, IDL.Text], [], []),
    'assignCallerUserRole': IDL.Func([IDL.Principal, UserRole], [], []),
    'createPost': IDL.Func([IDL.Text, IDL.Opt(ExternalBlob)], [], []),
    'deleteExpiredPosts': IDL.Func([], [], []),
    'getAllUsers': IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'getAllUsersAdminView': IDL.Func([], [IDL.Vec(AdminUserView)], ['query']),
    'getCallerAdminRole': IDL.Func([], [UserAdminRole], ['query']),
    'getCallerEmail': IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'getCallerStatus': IDL.Func([], [UserStatus], ['query']),
    'getCallerUserProfile': IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'getCallerUserRole': IDL.Func([], [UserRole], ['query']),
    'getFeed': IDL.Func([IDL.Nat, IDL.Nat], [IDL.Vec(PostView)], ['query']),
    'getGroupMessages': IDL.Func([IDL.Nat, IDL.Nat], [IDL.Vec(ChatMessageView)], ['query']),
    'getMyNotifications': IDL.Func([], [IDL.Vec(NotificationView)], ['query']),
    'getPrivateMessages': IDL.Func([IDL.Principal, IDL.Nat, IDL.Nat], [IDL.Vec(ChatMessageView)], ['query']),
    'getProfile': IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
    'getUserPosts': IDL.Func([IDL.Principal, IDL.Nat, IDL.Nat], [IDL.Vec(PostView)], ['query']),
    'getUserProfile': IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
    'isCallerAdmin': IDL.Func([], [IDL.Bool], ['query']),
    'isSuperAdmin': IDL.Func([], [IDL.Bool], ['query']),
    'likePost': IDL.Func([PostId], [], []),
    'markAllNotificationsRead': IDL.Func([], [], []),
    'markNotificationRead': IDL.Func([NotificationId], [], []),
    'replyToComment': IDL.Func([PostId, CommentId, IDL.Text], [], []),
    'saveCallerEmail': IDL.Func([IDL.Text], [], []),
    'saveCallerUserProfile': IDL.Func([UserProfile], [], []),
    'sendGroupMessage': IDL.Func([IDL.Text], [], []),
    'sendPrivateMessage': IDL.Func([IDL.Principal, IDL.Text], [], []),
    'setHelperAdmin': IDL.Func([IDL.Principal, IDL.Bool], [], []),
    'startAutoDeleteTimer': IDL.Func([], [], []),
    'unlikePost': IDL.Func([PostId], [], []),
    'updateUserStatus': IDL.Func([IDL.Principal, UserStatus], [], []),
  });
};

export const init = ({ IDL }) => { return []; };
