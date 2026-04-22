import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './intro.html',
  styleUrl: './intro.css'
})
export class IntroComponent implements OnInit {
  showIntro = false;
  isFadingOut = false;
  
  @ViewChild('introVideo') introVideo!: ElementRef<HTMLVideoElement>;

  ngOnInit() {
    const hasPlayed = sessionStorage.getItem('introPlayed');
    if (!hasPlayed) {
      this.showIntro = true;
      
      // Safety timeout: Ensure splash screen disappears even if video fails
      setTimeout(() => {
        if (this.showIntro && !this.isFadingOut) {
          console.warn('[Intro] Safety timeout reached, forcing transition.');
          this.finishIntro();
        }
      }, 3500); 
    }
  }

  onVideoError() {
    console.error('[Intro] Video failed to load/play, skipping intro.');
    this.finishIntro();
  }

  onVideoEnded() {
    this.finishIntro();
  }

  skipIntro() {
    this.finishIntro();
  }

  private finishIntro() {
    if (!this.showIntro) return;
    
    this.isFadingOut = true;
    
    // Allow CSS fade transition to finish
    setTimeout(() => {
      this.showIntro = false;
      this.isFadingOut = false;
      sessionStorage.setItem('introPlayed', 'true');
    }, 800); // 800ms duration matching CSS
  }
}
