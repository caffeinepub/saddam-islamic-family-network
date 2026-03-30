/* eslint-disable */

// @ts-nocheck

import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export type ChatMessageId = string;
export interface ChatMessageView {
  'id' : ChatMessageId,
  'content' : string,
  'recipient' : [] | [Principal],
  'sender' : Principal,
  'createdTimestamp' : Time,
  'imageBlobId' : [] | [ExternalBlob],
}
export type CommentId = string;
export interface CommentView {
  'id' : CommentId,
  'content' : string,
  'author' : Principal,
  'createdTimestamp' : Time,
  'replies' : Array<CommentView>,
  'postId' : PostId,
}
export type ExternalBlob = Uint8Array;
export type NotificationId = string;
export type NotificationType = { 'like' : null } | { 'comment' : null };
export interface NotificationView {
  'id' : NotificationId,
  'notifType' : NotificationType,
  'isRead' : boolean,
  'senderPrincipal' : Principal,
  'message' : string,
  'createdTimestamp' : Time,
  'recipientPrincipal' : Principal,
  'postId' : PostId,
}
export type PostId = string;
export interface PostView {
  'id' : PostId,
  'content' : string,
  'author' : Principal,
  'likes' : Array<Principal>,
  'createdTimestamp' : Time,
  'comments' : Array<CommentView>,
  'imageBlobId' : [] | [ExternalBlob],
}
export type Time = bigint;
export type UserStatus = { 'pending' : null } | { 'approved' : null } | { 'rejected' : null } | { 'blocked' : null };
export type UserAdminRole = { 'none' : null } | { 'helperAdmin' : null } | { 'superAdmin' : null };
export interface UserProfile {
  'bio' : string,
  'username' : string,
  'profilePhotoId' : [] | [ExternalBlob],
  'coverPhotoId' : [] | [ExternalBlob],
}
export interface AdminUserView {
  'principal' : Principal,
  'profile' : UserProfile,
  'email' : string,
  'status' : UserStatus,
  'adminRole' : UserAdminRole,
  'signupDate' : Time,
}
export type UserRole = { 'admin' : null } | { 'user' : null } | { 'guest' : null };
export interface _CaffeineStorageCreateCertificateResult {
  'method' : string,
  'blob_hash' : string,
}
export interface _CaffeineStorageRefillInformation {
  'proposed_top_up_amount' : [] | [bigint],
}
export interface _CaffeineStorageRefillResult {
  'success' : [] | [boolean],
  'topped_up_amount' : [] | [bigint],
}
export interface _SERVICE {
  '_caffeineStorageBlobIsLive' : ActorMethod<[Uint8Array], boolean>,
  '_caffeineStorageBlobsToDelete' : ActorMethod<[], Array<Uint8Array>>,
  '_caffeineStorageConfirmBlobDeletion' : ActorMethod<[Array<Uint8Array>], undefined>,
  '_caffeineStorageCreateCertificate' : ActorMethod<[string], _CaffeineStorageCreateCertificateResult>,
  '_caffeineStorageRefillCashier' : ActorMethod<[[] | [_CaffeineStorageRefillInformation]], _CaffeineStorageRefillResult>,
  '_caffeineStorageUpdateGatewayPrincipals' : ActorMethod<[], undefined>,
  '_initializeAccessControlWithSecret' : ActorMethod<[string], undefined>,
  'addComment' : ActorMethod<[PostId, string], undefined>,
  'assignCallerUserRole' : ActorMethod<[Principal, UserRole], undefined>,
  'createPost' : ActorMethod<[string, [] | [ExternalBlob]], undefined>,
  'deleteExpiredPosts' : ActorMethod<[], undefined>,
  'getAllUsers' : ActorMethod<[], Array<Principal>>,
  'getAllUsersAdminView' : ActorMethod<[], Array<AdminUserView>>,
  'getCallerAdminRole' : ActorMethod<[], UserAdminRole>,
  'getCallerEmail' : ActorMethod<[], [] | [string]>,
  'getCallerStatus' : ActorMethod<[], UserStatus>,
  'getCallerUserProfile' : ActorMethod<[], [] | [UserProfile]>,
  'getCallerUserRole' : ActorMethod<[], UserRole>,
  'getFeed' : ActorMethod<[bigint, bigint], Array<PostView>>,
  'getGroupMessages' : ActorMethod<[bigint, bigint], Array<ChatMessageView>>,
  'getMyNotifications' : ActorMethod<[], Array<NotificationView>>,
  'getPrivateMessages' : ActorMethod<[Principal, bigint, bigint], Array<ChatMessageView>>,
  'getProfile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'getUserPosts' : ActorMethod<[Principal, bigint, bigint], Array<PostView>>,
  'getUserProfile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'isCallerAdmin' : ActorMethod<[], boolean>,
  'isSuperAdmin' : ActorMethod<[], boolean>,
  'likePost' : ActorMethod<[PostId], undefined>,
  'markAllNotificationsRead' : ActorMethod<[], undefined>,
  'markNotificationRead' : ActorMethod<[NotificationId], undefined>,
  'replyToComment' : ActorMethod<[PostId, CommentId, string], undefined>,
  'saveCallerEmail' : ActorMethod<[string], undefined>,
  'saveCallerUserProfile' : ActorMethod<[UserProfile], undefined>,
  'sendGroupMessage' : ActorMethod<[string], undefined>,
  'sendPrivateMessage' : ActorMethod<[Principal, string], undefined>,
  'setHelperAdmin' : ActorMethod<[Principal, boolean], undefined>,
  'startAutoDeleteTimer' : ActorMethod<[], undefined>,
  'unlikePost' : ActorMethod<[PostId], undefined>,
  'emailExists' : ActorMethod<[string], boolean>,
  'resetPasswordForEmail' : ActorMethod<[string], undefined>,
  'cleanupIncompleteUsers' : ActorMethod<[], bigint>,
  'updateUserStatus' : ActorMethod<[Principal, UserStatus], undefined>,
}
export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
