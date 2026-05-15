import frappe
from frappe.model.document import Document


@frappe.whitelist()
def get_factor_formula(appraisal, core_factors):
    result = frappe.db.get_value(
        'Factors Setup',
        {'parent': appraisal, 'factor': core_factors},
        ['formula', 'weight'],
        as_dict=True
    )
    return result or {}


class EmployeeAppraisal(Document):
    def before_save(self):
        # حذف الصفوف الفاضية
        self.appraisal_kpis = [row for row in self.appraisal_kpis if row.kpi]

        if not self.appraisal_kpis:
            self.score = 0
            self.final_score = 0
            return

        factor_data = frappe.db.get_value(
            'Factors Setup',
            {'parent': self.appraisal, 'factor': self.core_factors},
            ['formula', 'weight'],
            as_dict=True
        )

        if not factor_data or not factor_data.formula:
            self.score = 0
            self.final_score = 0
            return

        total_score = 0

        for row in self.appraisal_kpis:
            if not row.planned or not row.achieved or not row.weight:
                row.percent = 0
                row.score = 0
                continue

            if row.reverse_calc:
                row.percent = (row.planned / row.achieved) * 100
            else:
                row.percent = (row.achieved / row.planned) * 100

            formula = factor_data.formula.replace('percent', str(row.percent))
            score = frappe.safe_eval(formula)
            row.score = (row.weight * score) / 100

            total_score += row.score or 0

        self.score = total_score
        self.final_score = (total_score * factor_data.weight) / 100