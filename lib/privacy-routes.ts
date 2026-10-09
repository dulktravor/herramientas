/** These workspaces can contain secrets or arbitrary private text. */
export function isPrivateWorkspace(pathname: string) {
  return ['/herramientas/qr', '/herramientas/texto', '/herramientas/contrasenas', '/herramientas/unidades', '/herramientas/fechas', '/herramientas/colores'].includes(pathname.replace(/\/$/, ''));
}
