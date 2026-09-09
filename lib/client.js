window.__ModuleLoader__.load({
	id: "@furayoshi/dsh-ui-models-invert-selection",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		/**
		 * Client half of dsh-ui-models-invert-selection.
		 *
		 * The fetch-models dialog of the Models settings section preselects every
		 * candidate that is NOT already in the model list (its internal `picked`
		 * state). On a second "fetch + add" pass the user often wants the inverse:
		 * exactly the rows that are already added. That component exposes no slot
		 * or API for flipping its checkboxes, so this plugin watches the live DOM
		 * for the dialog's action row and appends one "Invert selection" button —
		 * a clone of the existing ghost/sm button, so it matches styling exactly.
		 * Clicking it clicks every candidate checkbox once, driving the dialog's
		 * real React state through the normal onChange path.
		 *
		 * The action row's CSS-module base name is matched on both known
		 * spellings: `candidateActions` (dsh <= 0.1.1-rc.2) and
		 * `candidateToolbar` (dsh >= 0.1.2-rc.1, where the row gained the
		 * candidate search input and the select-all ghost button moved into it).
		 *
		 * The marker attribute is shared with any in-process dynamic plugin that
		 * injects the same button, so two live versions never double-inject into
		 * one open dialog.
		 *
		 * The `id` passed to `window.__ModuleLoader__.load({ id })` above must
		 * match `package.json#name` and the `- insert` row of `cordis.patch.yml`;
		 * DSH looks up the registered bundle by this id.
		 */
		const MARKER = "data-modinv-injected";
		const CJK = /[\u4e00-\u9fff]/;
		const doc = typeof document === "undefined" ? null : document;

		exports.apply = (ctx) => {
			if (!doc || !doc.body) return;
			ctx.effect(() => {
				let observer = null;
				const injectInto = (actionsDiv) => {
					try {
						if (!actionsDiv || actionsDiv.hasAttribute(MARKER)) return;
						const originalButton = actionsDiv.querySelector("button");
						if (!originalButton) return;
						const parent = actionsDiv.parentElement;
						const listEl = parent ? parent.querySelector('[class*="candidateList"]') : null;
						if (!listEl || !listEl.querySelector('input[type="checkbox"]')) return;
						const isZh = CJK.test(originalButton.textContent || "");
						actionsDiv.setAttribute(MARKER, "1");
						const btn = originalButton.cloneNode(true);
						while (btn.firstChild !== null) btn.removeChild(btn.firstChild);
						btn.appendChild(doc.createTextNode(isZh ? "\u53cd\u9009" : "Invert selection"));
						btn.title = isZh
							? "\u53cd\u9009\uff1a\u628a\u7edf\u8ba1\u5217\u8868\u4e2d\u6bcf\u4e00\u9879\u7684\u52fe\u9009\u72b6\u6001\u53d6\u53cd"
							: "Invert selection: flip the checkbox of every row in the list";
						btn.style.marginLeft = "8px";
						btn.setAttribute("type", "button");
						const onClick = () => {
							try {
								const fresh = Array.prototype.slice.call(
									listEl.querySelectorAll('input[type="checkbox"]')
								);
								for (const box of fresh) box.click();
							} catch (error) {
								console.error(error instanceof Error ? error.message : String(error));
							}
						};
						btn.addEventListener("click", onClick);
						originalButton.insertAdjacentElement("afterend", btn);
					} catch (error) {
						console.error(error instanceof Error ? error.message : String(error));
					}
				};
				const scan = (rootNode) => {
					try {
						if (!rootNode || rootNode.nodeType !== 1) return;
						if (typeof rootNode.querySelectorAll !== "function") return;
						const divs = Array.prototype.slice.call(
							rootNode.querySelectorAll(
								'div[class*="candidateActions"], div[class*="candidateToolbar"]'
							)
						);
						for (const d of divs) injectInto(d);
					} catch (_error) {
						/* keep the watcher alive */
					}
				};
				scan(doc.body);
				observer = new MutationObserver((records) => {
					for (const record of records) {
						if (record.type !== "childList") continue;
						const added = Array.prototype.slice.call(record.addedNodes);
						for (const node of added) scan(node);
					}
				});
				observer.observe(doc.body, { childList: true, subtree: true });
				return () => {
					if (observer !== null) {
						try { observer.disconnect(); } catch (_error) { /* already disconnected */ }
						observer = null;
					}
				};
			}, "ui-models-invert-selection: fetch dialog watcher");
		};
		return module.exports;
	}
});
