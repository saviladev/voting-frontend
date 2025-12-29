import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, ToastController } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: 'reset-password.page.html',
  styleUrls: ['reset-password.page.scss'],
  imports: [CommonModule, IonContent, ReactiveFormsModule],
})
export class ResetPasswordPage implements OnInit {
  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
  });
  isSubmitting = false;
  statusMessage = '';
  token = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  async submit(): Promise<void> {
    if (!this.token) {
      const toast = await this.toastController.create({
        message: 'Token inválido o ausente.',
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { password, confirmPassword } = this.form.getRawValue();
    if (password !== confirmPassword) {
      const toast = await this.toastController.create({
        message: 'Las contraseñas no coinciden.',
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
      return;
    }

    this.isSubmitting = true;
    this.statusMessage = '';
    try {
      await firstValueFrom(this.authService.resetPassword({ token: this.token, password }));
      this.statusMessage = 'Contraseña actualizada. Ya puedes iniciar sesión.';
      this.form.reset();
    } catch (error) {
      const rawMessage = (error as { error?: { message?: string | string[] } })?.error?.message;
      const message =
        typeof rawMessage === 'string'
          ? rawMessage
          : Array.isArray(rawMessage)
            ? rawMessage.join(', ')
            : 'No se pudo restablecer la contraseña.';
      const toast = await this.toastController.create({
        message,
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.isSubmitting = false;
    }
  }

  async goBack(): Promise<void> {
    await this.router.navigateByUrl('/login');
  }
}
