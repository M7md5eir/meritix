import frappe
from frappe.utils.nestedset import rebuild_tree


def execute():
	"""Rebuild the Organization Nested Set tree.

	Earlier versions of the Organization controller extended ``Document``
	directly, so ``update_nsm`` never ran on insert / update and every
	row had ``lft = rgt = 0``. Once the controller starts extending
	``NestedSet`` we need a one-time rebuild for sites that already
	have Organization data, otherwise tree views and the Structure
	cascade's ancestry queries keep returning empty results.
	"""
	if not frappe.db.table_exists("Organization"):
		return

	if not frappe.db.exists("DocType", "Organization"):
		return

	rebuild_tree("Organization")
