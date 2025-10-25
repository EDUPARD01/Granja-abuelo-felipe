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
        'eduardo': '463756',
        'juan': '1234',
        'maria': '1234',
        'admin': 'admin123'
    }
};

// Estado de la app
let estadoApp = {
    repartidor: null,
    pedidos: [],
    pedidoSeleccionado: null
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
            .where('estado', '==', 'pendiente')
            .onSnapshot((snapshot) => {
                const pedidos = [];
                snapshot.forEach(doc => {
                    pedidos.push(doc.data());
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
            repartidor: estadoApp.repartidor
        });
        
        console.log('✅ Pedido actualizado:', pedidoId, nuevoEstado);
        return true;
    } catch (error) {
        console.error('❌ Error actualizando pedido:', error);
        return false;
    }
}

// ==================== INTERFAZ ====================
function actualizarUI() {
    const pedidosPendientes = estadoApp.pedidos.length;
    const pedidosHoy = estadoApp.pedidos.length;
    
    document.getElementById('pedidosPendientes').textContent = pedidosPendientes;
    document.getElementById('pedidosHoy').textContent = pedidosHoy;
    
    renderizarPedidos();
}

function renderizarPedidos() {
    pedidosList.innerHTML = '';
    
    if (estadoApp.pedidos.length === 0) {
        pedidosList.innerHTML = `
            <div class="bg-white rounded-xl p-6 text-center">
                <div class="text-gray-400 text-4xl mb-2">📦</div>
                <p class="text-gray-600">No hay pedidos pendientes</p>
                <p class="text-sm text-gray-500 mt-1">Los pedidos aparecerán aquí automáticamente</p>
            </div>
        `;
        return;
    }
    
    estadoApp.pedidos.forEach(pedido => {
        const pedidoElement = document.createElement('div');
        pedidoElement.className = `bg-white rounded-xl p-4 shadow-sm border-l-4 fade-in pedido-pendiente`;
        
        let productosTexto = '';
        if (pedido.productos && Array.isArray(pedido.productos)) {
            pedido.productos.forEach(prod => {
                productosTexto += `${prod.nombre} x${prod.cantidad}, `;
            });
            productosTexto = productosTexto.slice(0, -2);
        } else {
            productosTexto = 'Productos no disponibles';
        }
        
        pedidoElement.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                    <h3 class="font-bold text-gray-800">${pedido.cliente || 'Sin nombre'}</h3>
                    <p class="text-sm text-gray-600">${pedido.direccion || 'Sin dirección'}</p>
                    <p class="text-xs text-gray-500 mt-1">${productosTexto}</p>
                </div>
                <span class="text-lg font-bold text-green-600 ml-2">Gs. ${parseInt(pedido.total || 0).toLocaleString()}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-xs text-gray-500">${pedido.id || 'Sin ID'}</span>
                <button class="ver-pedido-btn text-blue-600 hover:text-blue-800 text-sm font-medium" data-id="${pedido.id}">
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
    const pedido = estadoApp.pedidos.find(p => p.id === pedidoId);
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
                    <span>${prod.nombre} x${prod.cantidad}</span>
                    <span class="font-semibold">Gs. ${subtotal.toLocaleString()}</span>
                </div>
            `;
        });
    }
    
    const fecha = pedido.fecha ? 
        (pedido.fecha.toDate ? pedido.fecha.toDate().toLocaleString('es-PY') : new Date(pedido.fecha).toLocaleString('es-PY')) : 
        'Fecha no disponible';
    
    pedidoDetailContent.innerHTML = `
        <div class="space-y-4">
            <div>
                <h4 class="font-bold text-gray-700 mb-2">👤 Cliente</h4>
                <p class="text-gray-800">${pedido.cliente || 'No especificado'}</p>
                <p class="text-gray-600">📞 ${pedido.telefono || 'No especificado'}</p>
            </div>
            
            <div>
                <h4 class="font-bold text-gray-700 mb-2">📍 Dirección</h4>
                <p class="text-gray-800">${pedido.direccion || 'No especificado'}</p>
                <button onclick="abrirMapa('${pedido.direccion || ''}')" class="text-blue-600 text-sm mt-1">
                    <i class="fas fa-map-marker-alt mr-1"></i>Abrir en Maps
                </button>
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
                <h4 class="font-bold text-gray-700 mb-2">📋 Información</h4>
                <p class="text-gray-600">ID: ${pedido.id || 'No disponible'}</p>
                <p class="text-gray-600">Fecha: ${fecha}</p>
                <p class="text-gray-600">Estado: <span class="font-semibold text-yellow-600">PENDIENTE</span></p>
            </div>
        </div>
    `;
    
    // Mostrar botones
    acceptPedido.classList.remove('hidden');
    completePedido.classList.add('hidden');
    
    pedidoModal.classList.remove('hidden');
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
        const success = await actualizarEstadoPedido(estadoApp.pedidoSeleccionado.id, 'aceptado');
        
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
        const success = await actualizarEstadoPedido(estadoApp.pedidoSeleccionado.id, 'completado');
        
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

// ==================== UTILIDADES ====================
function abrirMapa(direccion) {
    if (!direccion) {
        alert('No hay dirección disponible');
        return;
    }
    const direccionCodificada = encodeURIComponent(direccion + ', Paraguay');
    const url = `https://www.google.com/maps/search/?api=1&query=${direccionCodificada}`;
    window.open(url, '_blank');
}

// ==================== INICIALIZACIÓN ====================
console.log('🚀 App de repartidores cargada');
console.log('👤 Usuarios disponibles:', Object.keys(CONFIG.REPARTIDORES));

// Service Worker para PWA (opcional)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('✅ Service Worker registrado'))
        .catch(error => console.log('❌ Error Service Worker:', error));
}
