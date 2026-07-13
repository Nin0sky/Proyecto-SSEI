import { Component } from '@angular/core';
import { IonApp, IonButton, IonRouterOutlet } from '@ionic/angular/standalone';
import { ThemeService } from './theme.service';
import { addIcons } from 'ionicons';
import { IonIcon } from '@ionic/angular/standalone';
import { moonOutline, sunnyOutline } from 'ionicons/icons';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  imports: [IonApp, IonRouterOutlet, IonButton, IonIcon],
})
export class AppComponent {
  constructor(private readonly themeService: ThemeService) {
    this.themeService.initializeTheme();
    addIcons({
      'moon-outline': moonOutline,
      'sunny-outline': sunnyOutline,
    });
  }

  isSunny = false;

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
    this.isSunny = !this.isSunny;

  }
}
