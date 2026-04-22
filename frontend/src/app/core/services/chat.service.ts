import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { ClerkService } from './clerk.service';
import { ApiService } from './api.service';
import { UserService } from './user-notification.service';
import { Observable, BehaviorSubject } from 'rxjs';

export interface ChatMessage {
  _id: string;
  senderId: any; // populated User
  receiverId: any;
  content: string;
  attachments?: string[];
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  userId: string;
  username: string;
  avatar: string;
  level: string;
  lastMsg: string;
  lastAt: string;
  unread: number;
  isMine: boolean;
  isTyping?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api   = inject(ApiService);
  private readonly clerk = inject(ClerkService);
  private readonly userSvc = inject(UserService);
  private socket?: Socket;

  readonly conversations = signal<Conversation[]>([]);
  readonly activeChatId  = signal<string | null>(null);
  readonly messages      = signal<ChatMessage[]>([]);
  readonly totalUnread   = signal(0);

  // Derive shared media from messages
  readonly sharedMedia = computed(() => {
    const allAttachments = this.messages()
      .filter(m => m.attachments && m.attachments.length > 0)
      .flatMap(m => m.attachments || []);
    return Array.from(new Set(allAttachments));
  });

  constructor() {
    // Re-connect when user changes
    effect(() => {
      const user = this.clerk.user();
      if (this.clerk.isLoaded() && user) {
        this.connect(user.id);
        this.refreshConversations();
        this.refreshUnreadStatus();
      } else {
        this.disconnect();
      }
    });
  }

  private connect(clerkId: string) {
    if (this.socket) return;

    this.socket = io(environment.apiUrl.replace('/api', ''), {
      auth: { clerkId },
      transports: ['websocket'],
    });

    this.socket.on('new_message', (msg: ChatMessage) => {
      // If we are currently viewing this chat, add to messages (avoid duplicates)
      if (this.isViewing(msg.senderId._id) || this.isViewing(msg.receiverId._id)) {
        this.messages.update(prev => {
          const exists = prev.some(m => m._id === msg._id);
          return exists ? prev : [...prev, msg];
        });
        if (!this.isMine(msg)) {
           this.markAsRead(msg.senderId._id).subscribe();
        }
      }
      
      this.refreshConversations();
      this.refreshUnreadStatus();
    });

    this.socket.on('user_typing_start', (data: { senderId: string }) => {
      this.setTyping(data.senderId, true);
    });

    this.socket.on('user_typing_stop', (data: { senderId: string }) => {
      this.setTyping(data.senderId, false);
    });
  }

  private disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
  }

  private isViewing(uid: string): boolean {
    return this.activeChatId() === uid;
  }

  public isMine(msg: ChatMessage): boolean {
     const myInternalId = this.userSvc.profile()?._id;
     if (!myInternalId) return false;

     const sId = typeof msg.senderId === 'string' ? msg.senderId : msg.senderId._id;
     return sId === myInternalId;
  }

  private setTyping(uid: string, typing: boolean) {
    this.conversations.update(list => 
      list.map(c => c.userId === uid ? { ...c, isTyping: typing } : c)
    );
  }

  // ─── API Methods ────────────────────────────────────────────────────────────

  refreshConversations() {
    this.api.get<{success: boolean, data: Conversation[]}>('/messages/conversations').subscribe(r => {
      if (r.success) this.conversations.set(r.data);
    });
  }

  refreshUnreadStatus() {
    this.api.get<{success: boolean, count: number}>('/messages/unread-count').subscribe(r => {
      if (r.success) this.totalUnread.set(r.count);
    });
  }

  loadMessages(userId: string) {
    this.activeChatId.set(userId);
    
    // Check if user is in our conversation list; if not, fetch details to show in sidebar
    const inList = this.conversations().find(c => c.userId === userId);
    if (!inList) {
      this.api.get<{success: boolean, data: any}>(`/auth/profile-by-id/${userId}`).subscribe(r => {
        if (r.success) {
          const newUser: Conversation = {
            userId: r.data._id,
            username: r.data.username,
            avatar: r.data.avatar,
            level: r.data.level || 'Beginner',
            lastMsg: 'Starting new transmission...',
            lastAt: new Date().toISOString(),
            unread: 0,
            isMine: false
          };
          this.conversations.update(list => {
            const exists = list.find(x => x.userId === userId);
            return exists ? list : [newUser, ...list];
          });
        }
      });
    }

    this.api.get<{success: boolean, data: ChatMessage[]}>(`/messages/${userId}`).subscribe(r => {
      if (r.success) {
        this.messages.set(r.data);
        this.refreshUnreadStatus();
        this.refreshConversations();
      }
    });
  }

  sendMessage(userId: string, content: string) {
    return this.api.post<{success: boolean, data: ChatMessage}>(`/messages/${userId}`, { content });
  }

  sendMessageForm(userId: string, formData: FormData) {
    return this.api.postForm<{success: boolean, data: ChatMessage}>(`/messages/${userId}`, formData);
  }

  markAsRead(userId: string): Observable<any> {
    // getMessages API already marks as read, but we can call it explicitly if needed
    return this.api.get(`/messages/${userId}`);
  }

  // Socket Emitters
  sendTypingStart(receiverId: string) {
    this.socket?.emit('typing_start', { receiverId });
  }

  sendTypingStop(receiverId: string) {
    this.socket?.emit('typing_stop', { receiverId });
  }
}
