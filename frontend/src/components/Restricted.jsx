// src/components/Restricted.jsx
const Restricted = ({ children, allowedRoles }) => {
  const userCargo = localStorage.getItem('cargo'); // Ex: 'TECNICO', 'GESTOR', 'SOCIO'

  // Proteção contra nulos (caso o user não tenha cargo definido)
  if (!userCargo) return null;

  // Se o cargo do usuário estiver na lista de permitidos, mostra o conteúdo
  if (allowedRoles.includes(userCargo.toUpperCase())) {
    return children;
  }

  // Se não tiver permissão, não renderiza nada
  return null;
};

export default Restricted;