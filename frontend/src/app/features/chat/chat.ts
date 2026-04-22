import { Component, inject, signal, effect, ElementRef, ViewChild, AfterViewChecked, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ChatService, Conversation, ChatMessage } from '../../core/services/chat.service';
import { ClerkService } from '../../core/services/clerk.service';
import { UserService } from '../../core/services/user-notification.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class ChatPage implements AfterViewChecked {
  private readonly route   = inject(ActivatedRoute);
  readonly chatSvc         = inject(ChatService);
  readonly clerk           = inject(ClerkService);
  private readonly userSvc = inject(UserService);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Search & Filtering
  searchText = signal('');
  filteredConversations = computed(() => {
    const term = this.searchText().toLowerCase().trim();
    const all = this.chatSvc.conversations();
    if (!term) return all;
    return all.filter(c => c.username.toLowerCase().includes(term) || c.lastMsg.toLowerCase().includes(term));
  });

  // Message & State
  newMessage = '';
  private lastScrollHeight = 0;
  sending = signal(false);

  // File handling
  selectedFiles: File[] = [];
  previews: string[] = [];

  constructor() {
    this.route.queryParams.subscribe(params => {
      const targetUid = params['user'];
      if (targetUid) {
        this.chatSvc.loadMessages(targetUid);
      }
    });

    // Auto-scroll on new messages
    effect(() => {
      this.chatSvc.messages(); // track dependency
      this.scrollToBottom();
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollContainer.nativeElement;
      if (el.scrollHeight !== this.lastScrollHeight) {
        el.scrollTop = el.scrollHeight;
        this.lastScrollHeight = el.scrollHeight;
      }
    } catch (err) {}
  }

  selectConversation(conv: Conversation) {
    this.chatSvc.loadMessages(conv.userId);
    this.clearFiles();
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (!files) return;

    for (const file of files) {
      if (this.selectedFiles.length >= 5) break;
      this.selectedFiles.push(file);
      const reader = new FileReader();
      reader.onload = (e: any) => this.previews.push(e.target.result);
      reader.readAsDataURL(file);
    }
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.previews.splice(index, 1);
  }

  clearFiles() {
    this.selectedFiles = [];
    this.previews = [];
  }

  send() {
    const cid = this.chatSvc.activeChatId();
    if (!cid || this.sending()) return;
    if (!this.newMessage.trim() && this.selectedFiles.length === 0) return;

    this.sending.set(true);

    if (this.selectedFiles.length > 0) {
      const fd = new FormData();
      fd.append('content', this.newMessage.trim());
      this.selectedFiles.forEach(f => fd.append('attachments', f));
      
      this.chatSvc.sendMessageForm(cid, fd).subscribe({
        next: (r) => {
          if (r.success) {
            this.newMessage = '';
            this.clearFiles();
            this.chatSvc.messages.update(msgs => [...msgs, r.data]);
            this.chatSvc.refreshConversations(); // Update sidebar preview
            this.chatSvc.sendTypingStop(cid);
          }
          this.sending.set(false);
        },
        error: () => this.sending.set(false)
      });
    } else {
      this.chatSvc.sendMessage(cid, this.newMessage).subscribe({
        next: (r) => {
          if (r.success) {
            this.newMessage = '';
            this.chatSvc.messages.update(msgs => [...msgs, r.data]);
            this.chatSvc.refreshConversations(); // Update sidebar preview
            this.chatSvc.sendTypingStop(cid);
          }
          this.sending.set(false);
        },
        error: () => this.sending.set(false)
      });
    }
  }

  onTyping() {
    const cid = this.chatSvc.activeChatId();
    if (cid) {
      this.chatSvc.sendTypingStart(cid);
    }
  }

  get otherUser(): Conversation | undefined {
    const activeId = this.chatSvc.activeChatId();
    if (!activeId) return undefined;
    
    const conv = this.chatSvc.conversations().find(c => c.userId === activeId);
    if (conv) return conv;

    // Fallback info from the first message in the feed if available
    const msg = this.chatSvc.messages().find(m => 
      (typeof m.senderId === 'object' && m.senderId._id === activeId) ||
      (typeof m.receiverId === 'object' && m.receiverId._id === activeId)
    );
    
    if (msg) {
      const other = (typeof msg.senderId === 'object' && msg.senderId._id === activeId) ? msg.senderId : msg.receiverId;
      return {
        userId: other._id,
        username: other.username,
        avatar: other.avatar,
        level: other.level || 'Beginner',
        lastMsg: '',
        lastAt: '',
        unread: 0,
        isMine: false
      };
    }

    return undefined;
  }

  get fallbackAvatar() {
    return 'https://ui-avatars.com/api/?background=A855F7&color=fff&bold=true&name=?';
  }

  isMyMessage(msg: ChatMessage): boolean {
    return this.chatSvc.isMine(msg);
  }
}
