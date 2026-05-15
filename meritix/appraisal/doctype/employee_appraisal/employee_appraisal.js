frappe.ui.form.on('Employee Appraisal', {
    onload: function(frm) {
        set_kpi_filter(frm);
    },
    core_factors: function(frm) {
        set_kpi_filter(frm);
    },
    before_save: function(frm) {
        var total = 0;
        frm.doc.appraisal_kpis.forEach(function(row) {
            total += flt(row.weight);
        });
        frm.dashboard.clear_headline();
        if (total !== 100 && total !== 0) {
            frm.dashboard.set_headline_alert(
                __('total weight must equal 100%, the current total is {0}%', [total]),
                'red'
            );
            frappe.validated = false;
        }
    }
});

frappe.ui.form.on('Appraisal KPIs', {
    kpi: function(frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (!row.kpi) return;

        var duplicates = frm.doc.appraisal_kpis.filter(function(d) {
            return d.kpi === row.kpi && d.name !== row.name;
        });

        frm.dashboard.clear_headline();

        if (duplicates.length > 0) {
            let kpi_name = frappe.utils.get_link_title('KPIs Setup', row.kpi) || row.kpi;
            frm.dashboard.set_headline_alert(
                __('the KPI "{0}" already exists', [kpi_name]),
                'red'
            );
            frappe.model.set_value(cdt, cdn, 'kpi', '');
        }
    },

    achieved: function(frm, cdt, cdn) {
        calculate_percent(frm, cdt, cdn);
    },
    planned: function(frm, cdt, cdn) {
        calculate_percent(frm, cdt, cdn);
    },
    reverse_calc: function(frm, cdt, cdn) {
        calculate_percent(frm, cdt, cdn);
    }
});

function calculate_percent(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (!row.planned || row.planned === 0 || !row.achieved || row.achieved === 0) {
        frappe.model.set_value(cdt, cdn, 'percent', 0);
        return;
    }

    let percent = row.reverse_calc
        ? (row.planned / row.achieved) * 100
        : (row.achieved / row.planned) * 100;

    frappe.model.set_value(cdt, cdn, 'percent', percent);
}

function set_kpi_filter(frm) {
    frm.set_query('kpi', 'appraisal_kpis', function() {
        return {
            filters: {
                core_factor: frm.doc.core_factors
            }
        };
    });
}