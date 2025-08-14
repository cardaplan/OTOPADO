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
	const STORAGE_KEY = 'orders_status_db_v1';

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

	// Expondo API global
	window.dataService = {
		getOrderStatus,
		updateOrderStatus,
		ensureOrderInitialized
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
*/