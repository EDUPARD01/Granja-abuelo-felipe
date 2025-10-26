// CONFIGURACIÓN FIREBASE - TUS DATOS
const firebaseConfig = {
    apiKey: "AIzaSyBi-UfoiEzwiMRv_9nH9ex_NWm7xVgtbEo",
    authDomain: "granja-abuelo-felipe.firebaseapp.com",
    projectId: "granja-abuelo-felipe",
    storageBucket: "granja-abuelo-felipe.firebasestorage.app",
    messagingSenderId: "164634430679",
    appId: "1:164634430679:web:31bef3f832a6ccda26f492"
};

// CONFIGURACIÓN REPARTIDORES
const CONFIG = {
    REPARTIDORES: {
        'eduardo': '6575665e',
        'Ronaldo': '3558111r',
        'maria': '1234',
        'admin': 'admin123'
    }
};

// Estado de la app
let estadoApp = {
    repartidor: null,
    pedidos: [],
    pedidoSeleccionado: null,
    filtroActual: 'todos'
};

// Elementos DOM
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const pedidosList = document.getElementById('pedidosList');
const pedidoModal = document.getElementById('pedidoModal');
const closeModal = document.getElementById('closeModal');
const acceptPedido = document.getElementById('acceptPedido');
const completePedido = document.getElementById('completePedido');
const pedidoDetailContent = document.getElementById('pedidoDetailContent');

// ==================== INICIALIZAR FIREBASE ====================
function inicializarFirebase() {
    try {
        // Verificar si Firebase ya está inicializado
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        const db = firebase.firestore();
        
        console.log('✅ Firebase inicializado correctamente');
        
        // Escuchar cambios en pedidos pendientes
        db.collection('pedidos')
            .where('estado', 'in', ['pendiente', 'aceptado'])
            .onSnapshot((snapshot) => {
                const pedidos = [];
                snapshot.forEach(doc => {
                    const pedidoData = doc.data();
                    pedidoData.firebaseId = doc.id; // Guardar ID de Firebase
                    pedidos.push(pedidoData);
                });
                estadoApp.pedidos = pedidos;
                actualizarUI();
                console.log('📦 Pedidos actualizados:', pedidos.length);
            });
            
        return db;
    } catch (error) {
        console.error('❌ Error inicializando Firebase:', error);
        return null;
    }
}

// ==================== LOGIN ====================
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    console.log('Intento de login:', username);
    
    if (CONFIG.REPARTIDORES[username] && CONFIG.REPARTIDORES[username] === password) {
        estadoApp.repartidor = username;
        document.getElementById('repartidorName').textContent = username.charAt(0).toUpperCase() + username.slice(1);
        
        // Ocultar login, mostrar app
        loginScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        
        // Inicializar Firebase
        const db = inicializarFirebase();
        
        if (db) {
            console.log('✅ Login exitoso, Firebase conectado');
        } else {
            alert('⚠️ Login exitoso, pero hay problemas con la conexión');
        }
        
    } else {
        alert('❌ Usuario o contraseña incorrectos');
        console.log('Login fallido. Usuarios disponibles:', Object.keys(CONFIG.REPARTIDORES));
    }
});

// ==================== ACTUALIZAR PEDIDO ====================
async function actualizarEstadoPedido(pedidoId, nuevoEstado) {
    try {
        const db = firebase.firestore();
        await db.collection('pedidos').doc(pedidoId).update({
            estado: nuevoEstado,
            repartidor: estadoApp.repartidor,
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Pedido actualizado:', pedidoId, nuevoEstado);
        return true;
    } catch (error) {
        console.error('❌ Error actualizando pedido:', error);
        return false;
    }
}

// ==================== FILTRAR PEDIDOS ====================
function filtrarPedidos() {
    const pedidosFiltrados = estadoApp.pedidos.filter(pedido => {
        switch(estadoApp.filtroActual) {
            case 'coronel-oviedo':
                return pedido.ciudad === 'Coronel Oviedo';
            case 'otras-ciudades':
                return pedido.ciudad !== 'Coronel Oviedo';
            default:
                return true;
        }
    });
    return pedidosFiltrados;
}

// ==================== INTERFAZ ====================
function actualizarUI() {
    const pedidosFiltrados = filtrarPedidos();
    const pedidosPendientes = pedidosFiltrados.filter(p => p.estado === 'pendiente').length;
    const pedidosAceptados = pedidosFiltrados.filter(p => p.estado === 'aceptado' && p.repartidor === estadoApp.repartidor).length;
    
    document.getElementById('pedidosPendientes').textContent = pedidosPendientes;
    document.getElementById('pedidosHoy').textContent = pedidosFiltrados.length;
    
    renderizarPedidos();
}

function renderizarPedidos() {
    const pedidosFiltrados = filtrarPedidos();
    
    pedidosList.innerHTML = '';
    
    if (pedidosFiltrados.length === 0) {
        pedidosList.innerHTML = `
            <div class="bg-white rounded-xl p-6 text-center">
                <div class="text-gray-400 text-4xl mb-2">📦</div>
                <p class="text-gray-600">No hay pedidos ${estadoApp.filtroActual !== 'todos' ? 'en esta categoría' : 'pendientes'}</p>
                <p class="text-sm text-gray-500 mt-1">Los pedidos aparecerán aquí automáticamente</p>
            </div>
        `;
        return;
    }
    
    pedidosFiltrados.forEach(pedido => {
        const pedidoElement = document.createElement('div');
        const esAceptado = pedido.estado === 'aceptado';
        const esMio = pedido.repartidor === estadoApp.repartidor;
        
        let claseEstado = 'pedido-pendiente';
        let textoEstado = '🟡 PENDIENTE';
        
        if (esAceptado && esMio) {
            claseEstado = 'pedido-aceptado';
            textoEstado = '🟢 ACEPTADO POR TI';
        } else if (esAceptado) {
            claseEstado = 'pedido-aceptado-otro';
            textoEstado = '🔵 ACEPTADO POR OTRO';
        }
        
        pedidoElement.className = `bg-white rounded-xl p-4 shadow-sm border-l-4 fade-in ${claseEstado}`;
        
        let productosTexto = '';
        if (pedido.productos && Array.isArray(pedido.productos)) {
            pedido.productos.forEach(prod => {
                productosTexto += `${prod.nombre} x${prod.cantidad}, `;
            });
            productosTexto = productosTexto.slice(0, -2);
        } else {
            productosTexto = 'Productos no disponibles';
        }
        
        // Información de ubicación y envío
        let infoUbicacion = '';
        if (pedido.ciudad === 'Coronel Oviedo') {
            infoUbicacion = `📍 ${pedido.ciudad} | 💵 ${pedido.metodoPago || 'Efectivo'}`;
        } else {
            infoUbicacion = `🚚 ${pedido.ciudad} | ${pedido.agenciaEnvio || 'Agencia por confirmar'}`;
        }
        
        pedidoElement.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                    <h3 class="font-bold text-gray-800">${pedido.cliente || 'Sin nombre'}</h3>
                    <p class="text-sm text-gray-600">${pedido.direccion || 'Sin dirección'}</p>
                    <p class="text-xs text-green-600 font-medium mt-1">${infoUbicacion}</p>
                    <p class="text-xs text-gray-500 mt-1">${productosTexto}</p>
                </div>
                <span class="text-lg font-bold text-green-600 ml-2">Gs. ${parseInt(pedido.total || 0).toLocaleString()}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-xs px-2 py-1 rounded-full ${esAceptado && esMio ? 'bg-green-100 text-green-800' : esAceptado ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}">${textoEstado}</span>
                <button class="ver-pedido-btn text-blue-600 hover:text-blue-800 text-sm font-medium" data-id="${pedido.firebaseId}">
                    Ver Detalles
                </button>
            </div>
        `;
        
        pedidosList.appendChild(pedidoElement);
    });
    
    // Agregar event listeners
    document.querySelectorAll('.ver-pedido-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const pedidoId = this.getAttribute('data-id');
            mostrarDetallePedido(pedidoId);
        });
    });
}

function mostrarDetallePedido(pedidoId) {
    const pedido = estadoApp.pedidos.find(p => p.firebaseId === pedidoId);
    if (!pedido) {
        alert('Pedido no encontrado');
        return;
    }
    
    estadoApp.pedidoSeleccionado = pedido;
    
    let productosHTML = '';
    if (pedido.productos && Array.isArray(pedido.productos)) {
        pedido.productos.forEach(prod => {
            const subtotal = (prod.precio || 0) * (prod.cantidad || 0);
            productosHTML += `
                <div class="flex justify-between py-2 border-b border-gray-100">
                    <div>
                        <span class="font-medium">${prod.nombre}</span>
                        <span class="text-sm text-gray-500 ml-2">x${prod.cantidad}</span>
                    </div>
                    <span class="font-semibold">Gs. ${subtotal.toLocaleString()}</span>
                </div>
            `;
        });
    }
    
    const fecha = pedido.fecha ? 
        (pedido.fecha.toDate ? pedido.fecha.toDate().toLocaleString('es-PY') : new Date(pedido.fecha).toLocaleString('es-PY')) : 
        'Fecha no disponible';

    // Información de ubicación y envío/pago
    let infoEnvioPago = '';
    if (pedido.ciudad === 'Coronel Oviedo') {
        infoEnvioPago = `
            <div class="bg-green-50 p-3 rounded-lg">
                <h4 class="font-bold text-green-800 mb-1">📍 Entrega en Coronel Oviedo</h4>
                <p class="text-green-700">Método de Pago: <span class="font-semibold">${pedido.metodoPago === 'transferencia' ? '🏦 Transferencia Bancaria' : '💵 Efectivo al recibir'}</span></p>
            </div>
        `;
    } else {
        infoEnvioPago = `
            <div class="bg-blue-50 p-3 rounded-lg">
                <h4 class="font-bold text-blue-800 mb-1">🚚 Envío a Otra Ciudad</h4>
                <p class="text-blue-700">Agencia: <span class="font-semibold">${pedido.agenciaEnvio || 'Por confirmar'}</span></p>
                ${pedido.departamento ? `<p class="text-blue-700">Departamento: <span class="font-semibold">${pedido.departamento}</span></p>` : ''}
                ${pedido.distrito ? `<p class="text-blue-700">Distrito: <span class="font-semibold">${pedido.distrito}</span></p>` : ''}
            </div>
        `;
    }
    
    // Generar enlace de Maps mejorado
    let mapsLink = '#';
    let mapsText = 'Abrir en Maps';
    let tieneCoordenadasExactas = false;
    
    if (pedido.coordenadas) {
        // Usar coordenadas exactas si están disponibles
        mapsLink = `https://www.google.com/maps/?q=${pedido.coordenadas.lat},${pedido.coordenadas.lng}&z=17`;
        mapsText = '📍 Abrir Ubicación Exacta en Maps';
        tieneCoordenadasExactas = true;
    } else if (pedido.mapa && pedido.mapa.includes('google.com/maps')) {
        // Usar enlace de mapa si está disponible
        mapsLink = pedido.mapa;
        mapsText = '🗺️ Abrir en Maps';
    } else {
        // Buscar por dirección textual
        const direccionCodificada = encodeURIComponent((pedido.direccion || '') + ', ' + (pedido.ciudad || '') + ', Paraguay');
        mapsLink = `https://www.google.com/maps/search/?api=1&query=${direccionCodificada}`;
        mapsText = '🔍 Buscar en Maps';
    }
    
    pedidoDetailContent.innerHTML = `
        <div class="space-y-4">
            ${infoEnvioPago}
            
            <div>
                <h4 class="font-bold text-gray-700 mb-2">👤 Cliente</h4>
                <p class="text-gray-800">${pedido.cliente || 'No especificado'}</p>
                <p class="text-gray-600">📞 ${pedido.telefono || 'No especificado'}</p>
            </div>
            
            <div>
                <h4 class="font-bold text-gray-700 mb-2">📍 Dirección de Entrega</h4>
                <p class="text-gray-800">${pedido.direccion || 'No especificado'}</p>
                <p class="text-sm text-gray-600 mt-1">${pedido.ciudad || ''} ${pedido.departamento ? `- ${pedido.departamento}` : ''}</p>
                
                <button onclick="abrirMapaExacto('${pedido.firebaseId}')" class="mt-2 w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    <i class="fas fa-map-marker-alt mr-2"></i>${mapsText}
                </button>
                ${pedido.coordenadas ? `
                    <p class="text-xs text-gray-500 mt-1">
                        <i class="fas fa-crosshairs mr-1"></i>
                        Coordenadas exactas disponibles
                    </p>
                ` : ''}
            </div>
            
            <div>
                <h4 class="font-bold text-gray-700 mb-2">🛒 Productos</h4>
                ${productosHTML || '<p class="text-gray-500">No hay información de productos</p>'}
                <div class="flex justify-between py-2 font-bold border-t border-gray-200 mt-2">
                    <span>TOTAL:</span>
                    <span class="text-green-600">Gs. ${parseInt(pedido.total || 0).toLocaleString()}</span>
                </div>
            </div>
            
            <div>
                <h4 class="font-bold text-gray-700 mb-2">📋 Información del Pedido</h4>
                <p class="text-gray-600">ID: ${pedido.id || 'No disponible'}</p>
                <p class="text-gray-600">Fecha: ${fecha}</p>
                <p class="text-gray-600">Estado: <span class="font-semibold ${pedido.estado === 'pendiente' ? 'text-yellow-600' : 'text-green-600'}">${pedido.estado?.toUpperCase() || 'PENDIENTE'}</span></p>
                ${pedido.repartidor ? `<p class="text-gray-600">Repartidor: ${pedido.repartidor}</p>` : ''}
            </div>
        </div>
    `;
    
    // Guardar el enlace de Maps para usar en la función
    estadoApp.pedidoSeleccionado.mapsLink = mapsLink;
    
    // Mostrar botones según el estado
    if (pedido.estado === 'pendiente') {
        acceptPedido.classList.remove('hidden');
        completePedido.classList.add('hidden');
    } else if (pedido.estado === 'aceptado' && pedido.repartidor === estadoApp.repartidor) {
        acceptPedido.classList.add('hidden');
        completePedido.classList.remove('hidden');
    } else {
        acceptPedido.classList.add('hidden');
        completePedido.classList.add('hidden');
    }
    
    pedidoModal.classList.remove('hidden');
}

// ==================== FUNCIÓN MEJORADA PARA ABRIR MAPS ====================
function abrirMapaExacto(pedidoId) {
    const pedido = estadoApp.pedidos.find(p => p.firebaseId === pedidoId);
    if (!pedido) {
        alert('Pedido no encontrado');
        return;
    }
    
    let mapsUrl;
    
    if (pedido.coordenadas) {
        // ✅ COORDENADAS EXACTAS - Esto abrirá el punto exacto
        mapsUrl = `https://www.google.com/maps/?q=${pedido.coordenadas.lat},${pedido.coordenadas.lng}&z=17`;
        console.log('📍 Abriendo coordenadas exactas:', pedido.coordenadas);
    } else if (pedido.mapa && pedido.mapa.includes('google.com/maps')) {
        // ✅ ENLACE DE MAPA GUARDADO
        mapsUrl = pedido.mapa;
        console.log('🗺️ Abriendo enlace guardado:', pedido.mapa);
    } else {
        // 🔍 BÚSQUEDA POR DIRECCIÓN
        const direccionCodificada = encodeURIComponent((pedido.direccion || '') + ', ' + (pedido.ciudad || '') + ', Paraguay');
        mapsUrl = `https://www.google.com/maps/search/?api=1&query=${direccionCodificada}`;
        console.log('🔍 Buscando por dirección:', pedido.direccion);
    }
    
    window.open(mapsUrl, '_blank');
}

// ==================== FILTROS ====================
function inicializarFiltros() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover clase active de todos los botones
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active', 'bg-green-100', 'text-green-800');
                b.classList.add('bg-gray-100', 'text-gray-600');
            });
            
            // Agregar clase active al botón clickeado
            this.classList.remove('bg-gray-100', 'text-gray-600');
            this.classList.add('active', 'bg-green-100', 'text-green-800');
            
            // Actualizar filtro
            estadoApp.filtroActual = this.getAttribute('data-filter');
            actualizarUI();
        });
    });
}

// ==================== EVENTOS ====================
logoutBtn.addEventListener('click', function() {
    estadoApp.repartidor = null;
    estadoApp.pedidos = [];
    
    mainApp.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
});

refreshBtn.addEventListener('click', function() {
    inicializarFirebase();
});

acceptPedido.addEventListener('click', async function() {
    if (estadoApp.pedidoSeleccionado) {
        const success = await actualizarEstadoPedido(estadoApp.pedidoSeleccionado.firebaseId, 'aceptado');
        
        if (success) {
            pedidoModal.classList.add('hidden');
            alert('✅ Pedido aceptado correctamente');
        } else {
            alert('❌ Error al aceptar pedido');
        }
    }
});

completePedido.addEventListener('click', async function() {
    if (estadoApp.pedidoSeleccionado) {
        const success = await actualizarEstadoPedido(estadoApp.pedidoSeleccionado.firebaseId, 'completado');
        
        if (success) {
            pedidoModal.classList.add('hidden');
            alert('🎉 Pedido marcado como entregado');
        } else {
            alert('❌ Error al completar pedido');
        }
    }
});

closeModal.addEventListener('click', function() {
    pedidoModal.classList.add('hidden');
});

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 App de repartidores cargada');
    console.log('👤 Usuarios disponibles:', Object.keys(CONFIG.REPARTIDORES));
    
    // Inicializar filtros
    inicializarFiltros();
    
    // Service Worker para PWA (opcional)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('✅ Service Worker registrado'))
            .catch(error => console.log('❌ Error Service Worker:', error));
    }
});
