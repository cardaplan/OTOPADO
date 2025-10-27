/**
 * script.js
 * 
 * Lógica compartilhada entre as páginas para habilitar o protótipo de rastreio.
 * - Geração de ID único de pedido
 * - Montagem do link de rastreio
 * - Integração com envio WhatsApp (quando ativo)
 * - Utilidades para leitura de querystring
 *
 * Integração Backend:
 * - Substituir pontos marcados com "Integração API" por chamadas reais ao seu backend.
 */

(function(window){
	function generateOrderId(){
		// ID simples legível: AAA-999-XXXX (data + random)
		const now = new Date();
		const datePart = now.toISOString().slice(2,10).replace(/-/g,''); // yymmdd
		const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
		return `${datePart}-${rand}`;
	}

	function getBaseUrl(){
		// Detecta host atual (útil para ambiente local/produção)
		return `${window.location.protocol}//${window.location.host}`;
	}

	function buildTrackingUrl(orderId){
		const base = getBaseUrl();
		return `${base}/rastreio.html?id=${encodeURIComponent(orderId)}`;
	}

	function getQueryParam(name){
		const url = new URL(window.location.href);
		return url.searchParams.get(name);
	}

	// Expor utilitários globalmente
	window.trackingUtils = {
		generateOrderId,
		buildTrackingUrl,
		getQueryParam
	};

	/**
	 * Hook opcional usado pela página principal para injetar ID/link no resumo do WhatsApp.
	 * Se rastreioAtivo=false no index principal, não use este helper.
	 */
	function appendTrackingToMessage(message, orderId){
		if(!orderId) return message;
		const url = buildTrackingUrl(orderId);
		message += `\n🔎 Rastreio do pedido:\n`;
		message += `• ID: ${orderId}\n`;
		message += `• Link: ${url}\n`;
		return message;
	}

	window.trackingHooks = { appendTrackingToMessage };

})(window);