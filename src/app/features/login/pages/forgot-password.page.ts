import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, ToastController } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: 'forgot-password.page.html',
  styleUrls: ['forgot-password.page.scss'],
  imports: [CommonModule, IonContent, ReactiveFormsModule],
})
export class ForgotPasswordPage {
  readonly form = this.fb.nonNullable.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
  });
  isSubmitting = false;
  statusMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
  ) {}

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.statusMessage = '';
    const { dni } = this.form.getRawValue();
    try {
      await firstValueFrom(this.authService.requestPasswordReset({ dni }));
      this.statusMessage = 'Si el usuario existe, recibirás un correo con las instrucciones.';
    } catch (error) {
      const rawMessage = (error as { error?: { message?: string | string[] } })?.error?.message;
      const message =
        typeof rawMessage === 'string'
          ? rawMessage
          : Array.isArray(rawMessage)
            ? rawMessage.join(', ')
            : 'No se pudo procesar la solicitud.';
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
