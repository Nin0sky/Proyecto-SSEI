import { Component } from '@angular/core';
import { IonApp, IonButton, IonRouterOutlet } from '@ionic/angular/standalone';
import { ThemeService } from './theme.service';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  imports: [IonApp, IonRouterOutlet, IonButton],
})
export class AppComponent {
  constructor(private readonly themeService: ThemeService) {
    this.themeService.initializeTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
