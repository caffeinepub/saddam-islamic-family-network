import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type CommentId = string;
export type Time = bigint;
export type PostId = string;
export interface PostView {
    id: PostId;
    content: string;
    author: Principal;
    likes: Array<Principal>;
    createdTimestamp: Time;
    comments: Array<CommentView>;
    imageBlobId?: ExternalBlob;
}
export interface CommentView {
    id: CommentId;
    content: string;
    author: Principal;
    createdTimestamp: Time;
    replies: Array<CommentView>;
    postId: PostId;
}
export type ChatMessageId = string;
export interface NotificationView {
    id: NotificationId;
    notifType: NotificationType;
    isRead: boolean;
    senderPrincipal: Principal;
    message: string;
    createdTimestamp: Time;
    recipientPrincipal: Principal;
    postId: PostId;
}
export interface AdminUserView {
    status: UserStatus;
    principal: Principal;
    signupDate: Time;
    email: string;
    adminRole: UserAdminRole;
    profile: UserProfile;
}
export type NotificationId = string;
export interface ChatMessageView {
    id: ChatMessageId;
    content: string;
    recipient?: Principal;
    sender: Principal;
    createdTimestamp: Time;
    imageBlobId?: ExternalBlob;
}
export interface UserProfile {
    bio: string;
    username: string;
    profilePhotoId?: ExternalBlob;
    coverPhotoId?: ExternalBlob;
}
export enum NotificationType {
    like = "like",
    comment = "comment"
}
export enum UserAdminRole {
    none = "none",
    superAdmin = "superAdmin",
    helperAdmin = "helperAdmin"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum UserStatus {
    pending = "pending",
    blocked = "blocked",
    approved = "approved",
    rejected = "rejected"
}
export interface backendInterface {
    addComment(postId: PostId, content: string): Promise<void>;
    addReaction(messageId: string, emoji: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    cleanupIncompleteUsers(): Promise<bigint>;
    createPost(content: string, imageBlobId: ExternalBlob | null): Promise<void>;
    deleteExpiredPosts(): Promise<void>;
    deleteMessageForEveryone(messageId: string): Promise<void>;
    deleteMessageForMe(messageId: string): Promise<void>;
    emailExists(email: string): Promise<boolean>;
    getAllUsers(): Promise<Array<Principal>>;
    getAllUsersAdminView(): Promise<Array<AdminUserView>>;
    getCallerAdminRole(): Promise<UserAdminRole>;
    getCallerEmail(): Promise<string | null>;
    getCallerStatus(): Promise<UserStatus>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDeletedForMe(): Promise<Array<string>>;
    getFeed(page: bigint, pageSize: bigint): Promise<Array<PostView>>;
    getGroupMessages(page: bigint, pageSize: bigint): Promise<Array<ChatMessageView>>;
    getMessageReactions(messageId: string): Promise<Array<[string, string]>>;
    getMyNotifications(): Promise<Array<NotificationView>>;
    getPrivateMessages(other: Principal, page: bigint, pageSize: bigint): Promise<Array<ChatMessageView>>;
    getProfile(user: Principal): Promise<UserProfile | null>;
    getUserPosts(user: Principal, page: bigint, pageSize: bigint): Promise<Array<PostView>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isSuperAdmin(): Promise<boolean>;
    likePost(postId: PostId): Promise<void>;
    markAllNotificationsRead(): Promise<void>;
    markNotificationRead(notifId: NotificationId): Promise<void>;
    removeReaction(messageId: string): Promise<void>;
    replyToComment(postId: PostId, commentId: CommentId, content: string): Promise<void>;
    resetPasswordForEmail(email: string): Promise<void>;
    saveCallerEmail(email: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendGroupMessage(content: string, imageBlobId: ExternalBlob | null): Promise<void>;
    sendPrivateMessage(recipient: Principal, content: string, imageBlobId: ExternalBlob | null): Promise<void>;
    setHelperAdmin(user: Principal, isHelper: boolean): Promise<void>;
    startAutoDeleteTimer(): Promise<void>;
    unlikePost(postId: PostId): Promise<void>;
    updateUserStatus(user: Principal, status: UserStatus): Promise<void>;
}
