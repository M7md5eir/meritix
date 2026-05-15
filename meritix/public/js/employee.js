// Re-attach each per-Structure Custom Field's `link_filters` to its
// standard-filter input on the Employee list view.
//
// Frappe's `make_standard_filters` rebuilds the filter input's docfield
// from scratch and does not carry `link_filters` across, so every
// per-Structure filter (Company / BU / Sub BU / Sector / ...) would
// otherwise show every Organization regardless of level. The form picker
// is fine on its own because the Link control honours `link_filters`
// directly from the field metadata.

frappe.listview_settings["Employee"] = {
	onload(listview) {
		frappe.after_ajax(() => apply_structure_filters(listview));
	},
};

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
