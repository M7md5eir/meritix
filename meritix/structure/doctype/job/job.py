from frappe.model.document import Document

from meritix.mixins.lifecycle import LifecycleMixin


class Job(LifecycleMixin, Document):
    pass
