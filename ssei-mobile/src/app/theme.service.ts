import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storageKey = 'ssei-theme-dark';
  private darkModeEnabled = false;

  get isDarkMode(): boolean {
    return this.darkModeEnabled;
  }

  initializeTheme(): void {
    const storedPreference = localStorage.getItem(this.storageKey);

    if (storedPreference !== null) {
      this.setDarkMode(storedPreference === 'true');
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.setDarkMode(prefersDark);
  }

  toggleTheme(): void {
    this.setDarkMode(!this.darkModeEnabled);
  }

  private setDarkMode(enabled: boolean): void {
    this.darkModeEnabled = enabled;
    document.documentElement.classList.toggle('ion-palette-dark', enabled);
    localStorage.setItem(this.storageKey, String(enabled));
  }
}
