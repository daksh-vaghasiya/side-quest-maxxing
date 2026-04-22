import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { ClerkService } from './core/services/clerk.service';
import { IntroComponent } from './shared/components/intro/intro';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, IntroComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly clerk = inject(ClerkService);
}
