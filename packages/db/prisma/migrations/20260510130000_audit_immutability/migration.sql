CREATE OR REPLACE FUNCTION reject_audit_modify() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only — % blocked by trigger', TG_OP
    USING ERRCODE = 'check_violation';
END
$$;

CREATE TRIGGER audit_events_reject_modify
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION reject_audit_modify();
