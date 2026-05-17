import frappe
from frappe.model.document import Document

from meritix.mixins.lifecycle import LifecycleMixin
from meritix.structure import cascade_custom_fields as cascade


class StructureLevel(LifecycleMixin, Document):

	def on_update(self):
		self._handle_label_rename()
		self._sync_custom_fields()

	def on_trash(self):
		self._remove_custom_fields()

	def _handle_label_rename(self):
		"""Rename Custom Fields when the structure label changes."""
		old_label = self.get_doc_before_save()
		if not old_label:
			return
		old_label = old_label.structure
		if not old_label or old_label == self.structure:
			return
		for row in self.applies_to or []:
			if row.target_doctype:
				cascade.rename(old_label, self.structure, row.target_doctype)

	def _sync_custom_fields(self):
		"""Create/update Custom Fields for every applies_to row and remove orphans."""
		if not self.structure:
			return

		# Suppress toast notifications from Custom Field create/update/delete
		prev = frappe.flags.mute_messages
		frappe.flags.mute_messages = True
		try:
			current_targets = set()
			for row in self.applies_to or []:
				if not row.target_doctype:
					continue
				cascade.ensure(self, row)
				current_targets.add(row.target_doctype)

			previous_targets = {
				r.target_doctype
				for r in frappe.get_all(
					"Custom Field",
					filters={
						"is_system_generated": 1,
						"options": "Organization",
						"fieldname": cascade.fieldname_for(self.structure),
					},
					fields=["dt as target_doctype"],
				)
			}
			for removed_dt in previous_targets - current_targets:
				cascade.remove(self.structure, removed_dt)
		finally:
			frappe.flags.mute_messages = prev

	def _remove_custom_fields(self):
		"""Remove all Custom Fields owned by this Structure Level."""
		if not self.structure:
			return
		for row in self.applies_to or []:
			if row.target_doctype:
				cascade.remove(self.structure, row.target_doctype)
