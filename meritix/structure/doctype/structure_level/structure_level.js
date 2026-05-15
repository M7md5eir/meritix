// Copyright (c) 2026, Mohamed Kheir and contributors
// For license information, please see license.txt

frappe.ui.form.on("Structure Level", {
	refresh(frm) {
		// Load insert_after options for all existing rows on form load
		(frm.doc.applies_to || []).forEach(function (row) {
			if (row.target_doctype) {
				_load_insert_after_options(frm, row);
			}
		});
	}
});

frappe.ui.form.on("Structure DF Creation", {
	target_doctype(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		if (row.target_doctype) {
			_load_insert_after_options(frm, row);
		} else {
			_set_insert_after_options(frm, row, []);
			frappe.model.set_value(cdt, cdn, "insert_after", "");
		}
	},

	form_render(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		if (row.target_doctype) {
			_load_insert_after_options(frm, row);
		}
	}
});

function _load_insert_after_options(frm, row) {
	frappe.model.with_doctype(row.target_doctype, function () {
		let meta = frappe.get_meta(row.target_doctype);
		let options = meta.fields.map(f => f.fieldname);
		_set_insert_after_options(frm, row, options);
	});
}

function _set_insert_after_options(frm, row, options) {
	let grid_row = frm.fields_dict.applies_to.grid.grid_rows_by_docname[row.name];
	if (grid_row) {
		let field = grid_row.get_field("insert_after");
		if (field) {
			field.set_data(options);
		}
	}
}
