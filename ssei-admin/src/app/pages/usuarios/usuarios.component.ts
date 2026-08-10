import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserService } from '../../core/services/user.service';
import { Usuario } from '../../core/models/user.model';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss']
})
export class UsuariosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);

  // Signals reactivos
  usuarios = signal<Usuario[]>([]);
  filtroRol = signal<string>('todos'); // Almacena el filtro activo
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  hidePassword = signal<boolean>(true);

  // Computado Reactivo: Filtra dinámicamente en memoria de forma instantánea
  usuariosFiltrados = computed(() => {
    const lista = this.usuarios();
    const filtro = this.filtroRol();
    if (filtro === 'todos') {
      return lista;
    }
    return lista.filter(u => u.role === filtro);
  });

  // Columnas actualizadas, agregando 'actions' al extremo derecho
  displayedColumns: string[] = ['fullName', 'email', 'role', 'status', 'createdAt', 'actions'];

  userForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['tecnico', [Validators.required]],
  });

  ngOnInit(): void {
    this.obtenerUsuarios();
  }

  obtenerUsuarios(): void {
    this.isLoading.set(true);
    this.userService.listarUsuarios().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.mostrarMensaje('Error al cargar el listado de usuarios', 'error-snackbar');
      }
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    this.userService.crearUsuario(this.userForm.value).subscribe({
      next: (nuevoUsuario) => {
        this.usuarios.update((lista) => [nuevoUsuario, ...lista]);
        this.userForm.reset({ role: 'tecnico' });
        this.userForm.get('password')?.setErrors(null);
        this.isSubmitting.set(false);
        this.mostrarMensaje('Usuario administrativo registrado con éxito');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errorMsg = err.error?.detail || 'Error al intentar crear el usuario';
        this.mostrarMensaje(errorMsg, 'error-snackbar');
      }
    });
  }

  /**
   * Cambia reactivamente el estado de activación en la base de datos (Borrado Lógico)
   */
  toggleActivo(usuario: Usuario): void {
    const nuevoEstado = !usuario.isActive;
    this.userService.cambiarEstadoActivo(usuario.id, nuevoEstado).subscribe({
      next: (usuarioEditado) => {
        this.usuarios.update(lista => 
          lista.map(u => u.id === usuario.id ? usuarioEditado : u)
        );
        const accion = nuevoEstado ? 'habilitado' : 'desactivado';
        this.mostrarMensaje(`El usuario ha sido ${accion} con éxito.`);
      },
      error: () => {
        this.mostrarMensaje('No se pudo cambiar el estado del usuario', 'error-snackbar');
      }
    });
  }

  /**
   * Intenta remover físicamente la cuenta si la base de datos lo autoriza
   */
  eliminarUsuario(id: number): void {
    if (!confirm('¿Está totalmente seguro de borrar físicamente esta cuenta de usuario?')) {
      return;
    }

    this.userService.eliminarUsuario(id).subscribe({
      next: () => {
        this.usuarios.update(lista => lista.filter(u => u.id !== id));
        this.mostrarMensaje('Usuario eliminado permanentemente del sistema.');
      },
      error: (err) => {
        const errorMsg = err.error?.detail || 'No se puede eliminar la cuenta físicamente por integridad referencial.';
        this.mostrarMensaje(errorMsg, 'error-snackbar');
      }
    });
  }

  private mostrarMensaje(mensaje: string, clase: string = ''): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: clase ? [clase] : []
    });
  }
}