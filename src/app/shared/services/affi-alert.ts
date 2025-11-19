// Wrapper de SweetAlert2 con estilos AFFI
import Swal from 'sweetalert2';

export const AffiAlert = Swal.mixin({
  customClass: {
    popup: 'affi-swal-popup',
    title: 'affi-swal-title',
    htmlContainer: 'affi-swal-text',
    confirmButton: 'affi-swal-btn affi-swal-btn--primary',
    cancelButton: 'affi-swal-btn affi-swal-btn--ghost'
  },
  buttonsStyling: false   // 👈 usamos nuestras clases, no las de SweetAlert
});
