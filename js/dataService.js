/**
 * dataService.js
 * 
 * Módulo de acesso a dados para o sistema de rastreio de pedidos.
 * - Hoje usa localStorage como “banco” simulado para protótipo navegável.
 * - Totalmente preparado para troca por backend real via API REST.
 *
 * CONTRATO:
 * - getOrderStatus(id: string): Promise<{ id: string, status: string, updatedAt: string } | null>
 * - updateOrderStatus(id: string, status: string): Promise<{ id: string, status: string, updatedAt: string }>
 * - listOrders(): Promise<Order[]>  // Lista pedidos com metadados
 * - getOrder(id: string): Promise<Order | null>
 * - upsertOrder(order: Order): Promise<Order>
 * - acceptOrder(id: string, delivererId: string): Promise<Order>
 * - seedDemoOrdersIfEmpty(): void
 *
 * STATUS SUPORTADOS:
 * - "confirmado" → Pedido confirmado (📦, azul)
 * - "preparacao" → Em preparação (👨‍🍳, laranja)
 * - "rota"       → Saiu para entrega (🚗💨, amarelo)
 * - "entregue"   → Entregue (✅, verde)
 *
 * IMPORTANTE PARA INTEGRAÇÃO REAL:
 * - Substitua os blocos marcados com "Trocar esta parte por chamada fetch() para seu backend quando disponível"
 *   por requisições HTTP para sua API (GET/POST/PUT). Veja exemplo ao final do arquivo.
 */

(function(window){
	const STORAGE_KEY = 'orders_status_db_v1'; // mapa simples: id → {id,status,updatedAt}
	const ORDERS_KEY = 'orders_db_v1'; // mapa: id → Order (metadados, aceite, etc.)

	function readDb(){
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			return raw ? JSON.parse(raw) : {};
		} catch(err){
			console.error('Erro lendo localStorage:', err);
			return {};
		}
	}

	function writeDb(db){
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
			return true;
		} catch(err){
			console.error('Erro salvando localStorage:', err);
			return false;
		}
	}

	function readOrdersDb(){
		try {
			const raw = localStorage.getItem(ORDERS_KEY);
			return raw ? JSON.parse(raw) : {};
		} catch(err){
			console.error('Erro lendo orders localStorage:', err);
			return {};
		}
	}

	function writeOrdersDb(db){
		try {
			localStorage.setItem(ORDERS_KEY, JSON.stringify(db));
			return true;
		} catch(err){
			console.error('Erro salvando orders localStorage:', err);
			return false;
		}
	}

	function notifyRealtimeEvent(eventName, payload){
		// Dispara evento simples via localStorage para abas diferentes (simula broadcast)
		try {
			localStorage.setItem('orders_event', JSON.stringify({ event: eventName, payload, ts: Date.now() }));
		} catch(e) {}
	}

	/**
	 * Obtém status do pedido pelo id.
	 * Trocar esta parte por chamada fetch() para seu backend quando disponível.
	 */
	async function getOrderStatus(id){
		// SIMULAÇÃO COM LOCALSTORAGE
		const db = readDb();
		return db[id] || null;

		// BACKEND REAL (EXEMPLO):
		// const resp = await fetch(`https://api.seudominio.com/orders/${id}`);
		// if(!resp.ok) return null;
		// const data = await resp.json();
		// return { id: data.id, status: data.status, updatedAt: data.updatedAt };
	}

	/**
	 * Atualiza status do pedido.
	 * Trocar esta parte por chamada fetch() para seu backend quando disponível.
	 */
	async function updateOrderStatus(id, status){
		// SIMULAÇÃO COM LOCALSTORAGE
		const allowed = ['confirmado','preparacao','rota','entregue'];
		if(!allowed.includes(status)){
			throw new Error('Status inválido: ' + status);
		}
		const db = readDb();
		const updated = { id, status, updatedAt: new Date().toISOString() };
		db[id] = updated;
		writeDb(db);
		return updated;

		// BACKEND REAL (EXEMPLO):
		// const resp = await fetch(`https://api.seudominio.com/orders/${id}`, {
		// 	method: 'PUT',
		// 	headers: { 'Content-Type': 'application/json' },
		// 	body: JSON.stringify({ status })
		// });
		// if(!resp.ok) throw new Error('Falha ao atualizar status');
		// return resp.json();
	}

	/**
	 * Garante que um novo pedido receba um status inicial.
	 * Use em conjunto com o fluxo de criação de pedidos na página principal.
	 */
	async function ensureOrderInitialized(id){
		const current = await getOrderStatus(id);
		if(!current){
			return updateOrderStatus(id, 'confirmado');
		}
		return current;
	}

	/**
	 * Lista pedidos (para painel). Ordena por data (mais recente primeiro).
	 */
	async function listOrders(){
		const db = readOrdersDb();
		const arr = Object.values(db);
		arr.sort((a,b)=> new Date(b.createdAt||0) - new Date(a.createdAt||0));
		return arr;
	}

	async function getOrder(id){
		const db = readOrdersDb();
		return db[id] || null;
	}

	async function upsertOrder(order){
		const db = readOrdersDb();
		const nowIso = new Date().toISOString();
		const prev = db[order.id] || {};
		db[order.id] = {
			id: order.id,
			customerName: order.customerName || prev.customerName || 'Cliente',
			customerPhone: order.customerPhone || prev.customerPhone || '',
			pickupAddress: order.pickupAddress || prev.pickupAddress || '',
			deliveryAddress: order.deliveryAddress || prev.deliveryAddress || '',
			amount: order.amount != null ? order.amount : (prev.amount || 0),
			createdAt: order.createdAt || prev.createdAt || nowIso,
			acceptedBy: order.acceptedBy || prev.acceptedBy || null,
			acceptedAt: order.acceptedAt || prev.acceptedAt || null
		};
		writeOrdersDb(db);
		notifyRealtimeEvent('order_upserted', { id: order.id });
		return db[order.id];
	}

	async function acceptOrder(id, delivererId){
		const db = readOrdersDb();
		const o = db[id];
		if(!o) throw new Error('Pedido não encontrado');
		if(o.acceptedBy && o.acceptedBy !== delivererId){
			throw new Error('Pedido já aceito por outro entregador');
		}
		o.acceptedBy = delivererId;
		o.acceptedAt = new Date().toISOString();
		writeOrdersDb(db);
		notifyRealtimeEvent('order_accepted', { id });
		return o;
	}

	function seedDemoOrdersIfEmpty(){
		const db = readOrdersDb();
		if(Object.keys(db).length > 0) return;
		const sample = [
			{ id: '250101-A1B2', customerName:'Ana Silva', customerPhone:'5511999990001', pickupAddress:'Loja Central', deliveryAddress:'Rua das Flores, 123 - Centro', amount: 64.90, createdAt: new Date().toISOString() },
			{ id: '250101-C3D4', customerName:'Bruno Souza', customerPhone:'5511988880002', pickupAddress:'Loja Central', deliveryAddress:'Av. Paulista, 1000 - Bela Vista', amount: 79.50, createdAt: new Date(Date.now()-3600e3).toISOString() },
			{ id: '241231-E5F6', customerName:'Carla Lima', customerPhone:'5511977770003', pickupAddress:'Loja Zona Sul', deliveryAddress:'Rua Verde, 45 - Jardim', amount: 42.00, createdAt: new Date(Date.now()-86400e3).toISOString() }
		];
		sample.forEach(o => { db[o.id] = o; });
		writeOrdersDb(db);
	}

	// Encapsular updateOrderStatus para notificar tempo real
	const baseUpdateOrderStatus = updateOrderStatus;
	async function updateOrderStatusWithNotify(id, status){
		const res = await baseUpdateOrderStatus(id, status);
		notifyRealtimeEvent('status_updated', { id, status });
		return res;
	}

	// Expondo API global
	window.dataService = {
		getOrderStatus,
		updateOrderStatus: updateOrderStatusWithNotify,
		ensureOrderInitialized,
		listOrders,
		getOrder,
		upsertOrder,
		acceptOrder,
		seedDemoOrdersIfEmpty
	};

})(window);

/*
EXEMPLO DE TROCA PARA BACKEND REAL (fetch + JSON):

async function getOrderStatus(id){
	const resp = await fetch(`https://api.seudominio.com/orders/${id}`);
	if(!resp.ok) return null;
	return resp.json();
}

async function updateOrderStatus(id, status){
	const resp = await fetch(`https://api.seudominio.com/orders/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ status })
	});
	if(!resp.ok) throw new Error('Falha ao atualizar status');
	return resp.json();
}

async function listOrders(){
	const resp = await fetch('https://api.seudominio.com/orders');
	if(!resp.ok) return [];
	return resp.json();
}
*/