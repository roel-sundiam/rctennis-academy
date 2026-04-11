import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  constructor(private auth: AuthService, private router: Router) {}

  goToAdmin(): void {
    this.router.navigate([this.auth.isLoggedIn() ? '/admin' : '/admin/login']);
  }
}
