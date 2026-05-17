// Cascade Custom Fields on the Employee list view.
//
// The cascade system stores Organization record names (e.g. "ORG-000003")
// in Data fields.  Data fields avoid Frappe's single-JOIN-per-DocType
// limitation that causes multiple Link→Organization columns to display
// the same title.  We resolve each ORG name to its display title here
// via a single batched call, and return the title wrapped in a link to
// the Organization form.

frappe.listview_settings["Employee"] = {
	onload(listview) {
		frappe.after_ajax(() => apply_structure_filters(listview));
		_build_cascade_formatters(listview);
	},
};

// ── Cascade formatters ──────────────────────────────────────────
// One formatter per cascade Data field.  All formatters share a single
// title cache that is populated in bulk on each page render.

const _org_title_cache = {};

function _build_cascade_formatters(listview) {
	const meta = frappe.get_meta("Employee");
	if (!meta) return;

	const cascade_fields = meta.fields.filter(
		(df) => df.fieldtype === "Data" && df.options === "Organization" && df.is_system_generated
	);
	if (!cascade_fields.length) return;

	if (!listview.settings.formatters) {
		listview.settings.formatters = {};
	}

	cascade_fields.forEach((df) => {
		listview.settings.formatters[df.fieldname] = (value) => {
			if (!value) return "";
			const title = _org_title_cache[value] || value;
			return `<a class="text-muted ellipsis"
				href="/app/organization/${encodeURIComponent(value)}"
				data-doctype="Organization" data-name="${frappe.utils.escape_html(value)}"
				title="${frappe.utils.escape_html(title)}">${frappe.utils.escape_html(title)}</a>`;
		};
	});

	// After each page render, fetch titles for all ORG names on screen.
	const orig_render = listview.render.bind(listview);
	listview.render = function () {
		orig_render();
		_fetch_org_titles(listview, cascade_fields);
	};
}

function _fetch_org_titles(listview, cascade_fields) {
	const names = new Set();
	(listview.data || []).forEach((doc) => {
		cascade_fields.forEach((df) => {
			const v = doc[df.fieldname];
			if (v && !(v in _org_title_cache)) names.add(v);
		});
	});

	if (!names.size) return;

	frappe.xcall(
		"meritix.structure.cascade_custom_fields.get_organization_titles",
		{ names: Array.from(names) }
	).then((map) => {
		Object.assign(_org_title_cache, map || {});
		// Re-render list rows so formatters pick up the titles.
		listview.$result.find(".list-row-container").each(function () {
			const $row = $(this);
			const name = $row.find("[data-name]").first().data("name");
			const doc = (listview.data || []).find((d) => d.name === name);
			if (!doc) return;

			cascade_fields.forEach((df) => {
				const v = doc[df.fieldname];
				if (!v) return;
				const title = _org_title_cache[v] || v;
				$row.find(`[data-field="${df.fieldname}"] .ellipsis, .list-row--col [data-name="${v}"]`).each(function () {
					const $el = $(this);
					if ($el.text().trim() !== title) {
						$el.text(title).attr("title", title);
					}
				});
			});
		});
	});
}

// ── Structure filter re-attachment ──────────────────────────────
// Re-attach each per-Structure Custom Field's `link_filters` to its
// standard-filter input.  Frappe's `make_standard_filters` rebuilds
// the filter input's docfield from scratch and does not carry
// `link_filters` across.

function apply_structure_filters(listview) {
	const meta = frappe.get_meta("Employee");
	if (!meta) return;

	meta.fields.forEach((df) => {
		if (df.fieldtype !== "Link") return;
		if (!df.in_standard_filter) return;
		if (!df.link_filters) return;

		const control = listview.page.fields_dict?.[df.fieldname];
		if (!control) return;

		let parsed;
		try {
			parsed = JSON.parse(df.link_filters);
		} catch (e) {
			return;
		}

		const query_filters = {};
		parsed.forEach(([, fieldname, operator, value]) => {
			query_filters[fieldname] = operator === "=" ? value : [operator, value];
		});

		control.df.get_query = () => ({ filters: query_filters });
	});
}
