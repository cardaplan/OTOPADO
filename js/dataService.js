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
 * - markDelivered(id: string, delivererId: string): Promise<Order>
 *
 * STATUS SUPORTADOS:
 * - "criado"     → Pedido criado (🕒, cinza)
 * - "confirmado" → Pedido confirmado (📦, indigo/azul)
 * - "preparacao" → Em preparação (👨‍🍳, laranja)
 * - "rota"       → Saiu para entrega (🚗💨, azul)
 * - "entregue"   → Entregue (✅, verde)
 */

(function(window){
	const STORAGE_KEY = 'orders_status_db_v1'; // mapa simples: id → {id,status,updatedAt}
	const ORDERS_KEY = 'orders_db_v1'; // mapa: id → Order (metadados, aceite, etc.)

	function readDb(){
		try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : {}; } catch(err){ console.error('Erro lendo localStorage:', err); return {}; }
	}
	function writeDb(db){
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); return true; } catch(err){ console.error('Erro salvando localStorage:', err); return false; }
	}
	function readOrdersDb(){
		try { const raw = localStorage.getItem(ORDERS_KEY); return raw ? JSON.parse(raw) : {}; } catch(err){ console.error('Erro lendo orders localStorage:', err); return {}; }
	}
	function writeOrdersDb(db){
		try { localStorage.setItem(ORDERS_KEY, JSON.stringify(db)); return true; } catch(err){ console.error('Erro salvando orders localStorage:', err); return false; }
	}
	function notifyRealtimeEvent(eventName, payload){ try { localStorage.setItem('orders_event', JSON.stringify({ event: eventName, payload, ts: Date.now() })); } catch(e) {}
	}

	async function getOrderStatus(id){
		const db = readDb();
		return db[id] || null;
	}

	async function updateOrderStatus(id, status){
		const allowed = ['criado','confirmado','preparacao','rota','entregue'];
		if(!allowed.includes(status)) throw new Error('Status inválido: ' + status);
		const db = readDb();
		const updated = { id, status, updatedAt: new Date().toISOString() };
		db[id] = updated;
		writeDb(db);
		return updated;
	}

	async function ensureOrderInitialized(id){
		const current = await getOrderStatus(id);
		if(!current){
			return updateOrderStatus(id, 'criado');
		}
		return current;
	}

	async function listOrders(){
		const db = readOrdersDb();
		const arr = Object.values(db);
		arr.sort((a,b)=> new Date(b.createdAt||0) - new Date(a.createdAt||0));
		return arr;
	}
	async function getOrder(id){ const db = readOrdersDb(); return db[id] || null; }
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
			acceptedAt: order.acceptedAt || prev.acceptedAt || null,
			deliveredBy: order.deliveredBy || prev.deliveredBy || null,
			deliveredAt: order.deliveredAt || prev.deliveredAt || null
		};
		writeOrdersDb(db);
		notifyRealtimeEvent('order_upserted', { id: order.id });
		return db[order.id];
	}
	async function acceptOrder(id, delivererId){
		const db = readOrdersDb();
		const o = db[id];
		if(!o) throw new Error('Pedido não encontrado');
		if(o.acceptedBy && o.acceptedBy !== delivererId) throw new Error('Pedido já aceito por outro entregador');
		o.acceptedBy = delivererId; o.acceptedAt = new Date().toISOString();
		writeOrdersDb(db);
		notifyRealtimeEvent('order_accepted', { id });
		return o;
	}
	async function markDelivered(id, delivererId){
		const db = readOrdersDb();
		const o = db[id] || { id };
		o.deliveredBy = delivererId;
		o.deliveredAt = new Date().toISOString();
		if(!o.createdAt) o.createdAt = new Date().toISOString();
		db[id] = o;
		writeOrdersDb(db);
		notifyRealtimeEvent('order_delivered', { id });
		return o;
	}

	const baseUpdateOrderStatus = updateOrderStatus;
	async function updateOrderStatusWithNotify(id, status){
		const res = await baseUpdateOrderStatus(id, status);
		notifyRealtimeEvent('status_updated', { id, status });
		return res;
	}

	window.dataService = {
		getOrderStatus,
		updateOrderStatus: updateOrderStatusWithNotify,
		ensureOrderInitialized,
		listOrders,
		getOrder,
		upsertOrder,
		acceptOrder,
		seedDemoOrdersIfEmpty,
		markDelivered
	};

})(window);