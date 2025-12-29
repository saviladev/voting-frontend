# Voting Frontend (Ionic + Angular)

Panel administrativo web para gestión de usuarios, RBAC, estructura organizacional, padrón y partidos.

### Requisitos
- Node 18+
- Backend corriendo en `http://localhost:3000` (configurable)

### Configuración
1) Instala dependencias:
```
npm install
```

2) Ajusta el API base si es necesario:
- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

### Ejecutar (dev)
```
ionic serve
```
Por defecto abre en `http://localhost:8100`.

### Build
```
ionic build
```
