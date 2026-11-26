const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/agent-ranks - List all associate/advisor ranks
router.get('/', authenticateToken, (req, res) => {
  try {
    const ranks = db.prepare(`
      SELECT 
        r.id,
        r.name,
        r.display_position,
        r.rank_position,
        r.collection_charge_commission,
        r.commission_percentage,
        COUNT(a.id) as associates_count,
        r.min_target,
        r.description,
        r.status,
        r.created_at,
        r.updated_at
      FROM agent_ranks r
      LEFT JOIN agents a ON r.id = a.rank_id AND a.status = 'ACTIVE'
      GROUP BY r.id
      ORDER BY r.display_position ASC, r.rank_position ASC
    `).all();

    res.json({
      success: true,
      ranks: ranks.map(r => ({
        ...r,
        collection_charge_commission: Boolean(r.collection_charge_commission),
        commission_enabled: Boolean(r.collection_charge_commission)
      }))
    });
  } catch (err) {
    console.error('Error fetching agent ranks:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch agent ranks', error: err.message });
  }
});

// POST /api/agent-ranks - Create new agent rank (Admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { 
      name, 
      display_position, 
      rank_position, 
      collection_charge_commission = 1,
      commission_percentage = 5.0,
      min_target = 0,
      description = '' 
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Rank name is required' });
    }

    const dispPos = parseInt(display_position) || 1;
    const rankPos = parseInt(rank_position) || 1;
    const commPct = parseFloat(commission_percentage) || 5.0;
    const target = parseFloat(min_target) || 0;
    const commFlag = collection_charge_commission ? 1 : 0;

    const info = db.prepare(`
      INSERT INTO agent_ranks (
        name, display_position, rank_position, collection_charge_commission, 
        commission_percentage, associates_count, min_target, description, status
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'ACTIVE')
    `).run(name.trim(), dispPos, rankPos, commFlag, commPct, target, description);

    res.json({
      success: true,
      message: `Rank '${name.trim()}' created successfully`,
      rankId: info.lastInsertRowid
    });
  } catch (err) {
    console.error('Error creating agent rank:', err);
    res.status(500).json({ success: false, message: 'Failed to create agent rank', error: err.message });
  }
});

// PUT /api/agent-ranks/:id - Update rank details
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const rankId = req.params.id;
    const { 
      name, 
      display_position, 
      rank_position, 
      collection_charge_commission,
      commission_percentage,
      min_target,
      description,
      status 
    } = req.body;

    const existing = db.prepare('SELECT * FROM agent_ranks WHERE id = ?').get(rankId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Agent rank not found' });
    }

    const updatedName = name !== undefined ? name.trim() : existing.name;
    const updatedDisp = display_position !== undefined ? parseInt(display_position) : existing.display_position;
    const updatedRankPos = rank_position !== undefined ? parseInt(rank_position) : existing.rank_position;
    const updatedComm = collection_charge_commission !== undefined ? (collection_charge_commission ? 1 : 0) : existing.collection_charge_commission;
    const updatedPct = commission_percentage !== undefined ? parseFloat(commission_percentage) : existing.commission_percentage;
    const updatedTarget = min_target !== undefined ? parseFloat(min_target) : existing.min_target;
    const updatedDesc = description !== undefined ? description : existing.description;
    const updatedStatus = status !== undefined ? status : existing.status;

    db.prepare(`
      UPDATE agent_ranks SET
        name = ?,
        display_position = ?,
        rank_position = ?,
        collection_charge_commission = ?,
        commission_percentage = ?,
        min_target = ?,
        description = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(updatedName, updatedDisp, updatedRankPos, updatedComm, updatedPct, updatedTarget, updatedDesc, updatedStatus, rankId);

    res.json({
      success: true,
      message: `Rank '${updatedName}' updated successfully`
    });
  } catch (err) {
    console.error('Error updating agent rank:', err);
    res.status(500).json({ success: false, message: 'Failed to update agent rank', error: err.message });
  }
});

// PATCH /api/agent-ranks/:id/toggle-commission - Quick toggle collection commission
router.patch('/:id/toggle-commission', authenticateToken, requireAdmin, (req, res) => {
  try {
    const rankId = req.params.id;
    const existing = db.prepare('SELECT * FROM agent_ranks WHERE id = ?').get(rankId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Rank not found' });
    }

    const newVal = existing.collection_charge_commission ? 0 : 1;
    db.prepare('UPDATE agent_ranks SET collection_charge_commission = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newVal, rankId);

    res.json({
      success: true,
      message: `Collection charge commission for '${existing.name}' is now ${newVal ? 'ENABLED' : 'DISABLED'}`,
      collection_charge_commission: Boolean(newVal)
    });
  } catch (err) {
    console.error('Error toggling commission:', err);
    res.status(500).json({ success: false, message: 'Failed to toggle commission', error: err.message });
  }
});

// DELETE /api/agent-ranks/:id - Delete rank
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const rankId = req.params.id;
    const existing = db.prepare('SELECT * FROM agent_ranks WHERE id = ?').get(rankId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Rank not found' });
    }

    const assocCount = db.prepare('SELECT count(*) as count FROM agents WHERE rank_id = ?').get(rankId);
    if (assocCount.count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete rank '${existing.name}'. There are ${assocCount.count} active associates assigned to this rank.` 
      });
    }

    db.prepare('DELETE FROM agent_ranks WHERE id = ?').run(rankId);
    res.json({ success: true, message: `Rank '${existing.name}' deleted successfully` });
  } catch (err) {
    console.error('Error deleting agent rank:', err);
    res.status(500).json({ success: false, message: 'Failed to delete rank', error: err.message });
  }
});

// GET /api/agent-ranks/:id/associates - List associates belonging to this rank
router.get('/:id/associates', authenticateToken, (req, res) => {
  try {
    const rankId = req.params.id;
    const rank = db.prepare('SELECT * FROM agent_ranks WHERE id = ?').get(rankId);
    if (!rank) {
      return res.status(404).json({ success: false, message: 'Rank not found' });
    }

    const associates = db.prepare(`
      SELECT 
        a.id,
        a.agent_code,
        a.full_name,
        a.phone,
        a.email,
        a.branch_id,
        b.branch_name,
        a.rank_id,
        r.name as rank_name,
        a.collection_charge_enabled,
        a.commission_rate,
        a.total_business_collected,
        a.total_commission_paid,
        a.status,
        a.joining_date
      FROM agents a
      LEFT JOIN branches b ON a.branch_id = b.id
      LEFT JOIN agent_ranks r ON a.rank_id = r.id
      WHERE a.rank_id = ?
      ORDER BY a.agent_code ASC
    `).all(rankId);

    res.json({
      success: true,
      rank,
      associates
    });
  } catch (err) {
    console.error('Error fetching rank associates:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch associates', error: err.message });
  }
});

// GET /api/agents - List all agents / advisors
router.get('/all-agents', authenticateToken, (req, res) => {
  try {
    const { rank_id, branch_id, search } = req.query;
    let query = `
      SELECT 
        a.id,
        a.agent_code,
        a.full_name,
        a.phone,
        a.email,
        a.branch_id,
        COALESCE(b.branch_name, a.branch_name) as branch_name,
        a.rank_id,
        COALESCE(r.name, a.rank_name) as rank_name,
        r.display_position,
        r.rank_position,
        a.collection_charge_enabled,
        a.commission_rate,
        a.total_business_collected,
        a.total_commission_paid,
        a.status,
        a.joining_date
      FROM agents a
      LEFT JOIN branches b ON a.branch_id = b.id
      LEFT JOIN agent_ranks r ON a.rank_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (rank_id) {
      query += ` AND a.rank_id = ?`;
      params.push(rank_id);
    }
    if (branch_id) {
      query += ` AND a.branch_id = ?`;
      params.push(branch_id);
    }
    if (search) {
      query += ` AND (a.full_name LIKE ? OR a.agent_code LIKE ? OR a.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY r.rank_position ASC, a.total_business_collected DESC`;

    const agents = db.prepare(query).all(...params);
    const totalBusiness = agents.reduce((acc, a) => acc + (a.total_business_collected || 0), 0);
    const totalCommission = agents.reduce((acc, a) => acc + (a.total_commission_paid || 0), 0);

    res.json({
      success: true,
      agents,
      total_count: agents.length,
      total_business: totalBusiness,
      total_commission: totalCommission
    });
  } catch (err) {
    console.error('Error fetching agents:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch agents', error: err.message });
  }
});

// POST /api/agents/create - Enroll new associate / advisor
router.post('/create', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      full_name,
      phone,
      email = '',
      branch_id = 1,
      branch_name,
      rank_id = 6,
      rank_name,
      commission_rate = 5.0
    } = req.body;

    if (!full_name || !full_name.trim() || !phone || !String(phone).trim()) {
      return res.status(400).json({ success: false, message: 'Advisor name and phone number are required' });
    }

    const branchRow = db.prepare('SELECT id, branch_name FROM branches WHERE id = ?').get(branch_id);
    const rankRow = db.prepare('SELECT id, name FROM agent_ranks WHERE id = ?').get(rank_id);
    const seq = (db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM agents').get()?.nextId) || 1;
    const agentCode = `AGT-${String(seq).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const info = db.prepare(`
      INSERT INTO agents (
        agent_code, full_name, phone, email, branch_id, branch_name,
        rank_id, rank_name, collection_charge_enabled, commission_rate,
        total_business_collected, total_commission_paid, status, joining_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, 0, 'ACTIVE', ?)
    `).run(
      agentCode,
      full_name.trim(),
      String(phone).trim(),
      email ? String(email).trim() : null,
      branchRow?.id || Number(branch_id) || 1,
      branchRow?.branch_name || branch_name || 'MAIN BRANCH',
      rankRow?.id || Number(rank_id) || 6,
      rankRow?.name || rank_name || 'ADVISOR',
      Number(commission_rate) || 5.0,
      today
    );

    const created = db.prepare('SELECT * FROM agents WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({
      success: true,
      message: `Advisor '${full_name.trim()}' (${agentCode}) enrolled successfully`,
      agent: created
    });
  } catch (err) {
    console.error('Error creating agent:', err);
    res.status(500).json({ success: false, message: 'Failed to create advisor', error: err.message });
  }
});

module.exports = router;
