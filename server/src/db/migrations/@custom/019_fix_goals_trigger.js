'use strict'

/**
 * Migration 019 – Fix goals trigger syntax
 * The trigger was created without parentheses in EXECUTE FUNCTION, causing syntax errors.
 * This migration drops and recreates it with the correct syntax.
 * 
 * Related: task #9391
 */

exports.up = async (db) => {
  // Drop the existing trigger and recreate it with correct syntax
  await db.none('DROP TRIGGER IF EXISTS goals_updated_at_trigger ON goals')
  
  await db.none(`
    CREATE TRIGGER goals_updated_at_trigger
      BEFORE UPDATE ON goals
      FOR EACH ROW
      EXECUTE FUNCTION update_goals_updated_at()
  `)
  
  console.log('[019_fix_goals_trigger] Fixed trigger syntax - added parentheses to EXECUTE FUNCTION')
}

exports.down = async (db) => {
  // Rollback: drop the trigger (don't recreate the buggy version)
  await db.none('DROP TRIGGER IF EXISTS goals_updated_at_trigger ON goals')
  
  console.log('[019_fix_goals_trigger] Rolled back - trigger dropped')
}
