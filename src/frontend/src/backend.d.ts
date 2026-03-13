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
export interface PostView {
    id: PostId;
    content: string;
    author: Principal;
    likes: Array<Principal>;
    createdTimestamp: Time;
    comments: Array<CommentView>;
    imageBlobId?: ExternalBlob;
}
export type PostId = string;
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
export type NotificationId = string;
export interface ChatMessageView {
    id: ChatMessageId;
    content: string;
    recipient?: Principal;
    sender: Principal;
    createdTimestamp: Time;
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
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(postId: PostId, content: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createPost(content: string, imageBlobId: ExternalBlob | null): Promise<void>;
    deleteExpiredPosts(): Promise<void>;
    getAllUsers(): Promise<Array<Principal>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFeed(page: bigint, pageSize: bigint): Promise<Array<PostView>>;
    getGroupMessages(page: bigint, pageSize: bigint): Promise<Array<ChatMessageView>>;
    getMyNotifications(): Promise<Array<NotificationView>>;
    getPrivateMessages(other: Principal, page: bigint, pageSize: bigint): Promise<Array<ChatMessageView>>;
    getProfile(user: Principal): Promise<UserProfile | null>;
    getUserPosts(user: Principal, page: bigint, pageSize: bigint): Promise<Array<PostView>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    likePost(postId: PostId): Promise<void>;
    markAllNotificationsRead(): Promise<void>;
    markNotificationRead(notifId: NotificationId): Promise<void>;
    replyToComment(postId: PostId, commentId: CommentId, content: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendGroupMessage(content: string): Promise<void>;
    sendPrivateMessage(recipient: Principal, content: string): Promise<void>;
    startAutoDeleteTimer(): Promise<void>;
    unlikePost(postId: PostId): Promise<void>;
}
