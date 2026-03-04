-- Enforce that at most one user can have role='operator'.
-- This partial unique index fires P2002 on concurrent registrations that both race to
-- be the first user, allowing the handler to safely retry the second one as role='user'.
CREATE UNIQUE INDEX "User_single_operator" ON "User" ("role") WHERE role = 'operator';
