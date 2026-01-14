import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent, IonList, IonItem, IonLabel, IonInput, IonButton, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonSpinner, IonNote
} from '@ionic/angular/standalone';
import { UsersService, UpdateProfileDto } from '../../../core/services/users.service';
import { AuthService } from '../../../core/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, IonContent, IonList, IonItem, IonLabel,
    IonInput, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonSpinner, IonNote
  ],
})
export class ProfilePage implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  status = signal<'loading' | 'loaded' | 'error'>('loading');
  updateStatus = signal<'idle' | 'saving' | 'success' | 'error'>('idle');
  updateError = signal('');

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private authService: AuthService,
  ) {
    this.profileForm = this.fb.group({
      // dni: [{ value: '', disabled: true }],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });

    this.passwordForm = this.fb.group({
      oldPassword: [''],
      newPassword: [''],
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  async loadUserProfile() {
    this.status.set('loading');
    try {
      const user = await firstValueFrom(this.usersService.getMe());
      this.profileForm.patchValue(user);
      this.status.set('loaded');
    } catch (error) {
      this.status.set('error');
    }
  }

  async onUpdateProfile() {
    if (this.profileForm.invalid) {
      return;
    }
    this.updateStatus.set('saving');
    this.updateError.set('');

    const dto: UpdateProfileDto = this.profileForm.getRawValue();

    try {
      await firstValueFrom(this.usersService.updateMe(dto));
      this.updateStatus.set('success');
      // Refresh user data in auth service
      this.authService.refreshUser().subscribe();
    } catch (error: any) {
      this.updateStatus.set('error');
      this.updateError.set(error.error?.message || 'Ocurrió un error al actualizar.');
    }
  }

  async onChangePassword() {
    if (this.passwordForm.invalid) {
      return;
    }
    const { oldPassword, newPassword } = this.passwordForm.value;
    if (!newPassword || !oldPassword) {
      this.updateError.set('Debe proporcionar la contraseña actual y la nueva.');
      return;
    }

    this.updateStatus.set('saving');
    this.updateError.set('');

    const dto: UpdateProfileDto = { oldPassword, newPassword };

    try {
      await firstValueFrom(this.usersService.updateMe(dto));
      this.updateStatus.set('success');
      this.passwordForm.reset();
    } catch (error: any) {
      this.updateStatus.set('error');
      this.updateError.set(error.error?.message || 'Ocurrió un error al cambiar la contraseña.');
    }
  }
}