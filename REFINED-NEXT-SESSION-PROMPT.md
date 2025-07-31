# Next Session: Refined EPO Webhook Logic & Deployment

## 🎯 **REFINED AUTOMATION LOGIC** (Based on User Feedback)

### **Current Logic (Broad Sweep)**
✅ Built: Every 10 minutes, check ALL bulk items → update if ALL their EPOs are "QA Passed"

### **NEW PREFERRED LOGIC (Targeted Webhook)**
🎯 **Webhook Trigger**: EPO status changes to "QA Passed" or "Cancelled"
🔍 **Smart Processing**: Only check items connected to THAT specific EPO
⚡ **Efficiency**: Process 1-5 related items instead of all 95+ bulk items

## 🚀 **NEW WEBHOOK WORKFLOW**

### **Step 1: EPO Webhook Trigger**
- **Board**: EPO Board (9387127195)
- **Event**: Column value changed (`deal_stage`)  
- **Filter**: Status changes to "QA Passed" OR "Cancelled"
- **Payload**: Includes the specific EPO item ID that changed

### **Step 2: Find Connected Items**
```
EPO Item Changed → What boards is it connected to?
├── Development Board (8446397459)
├── Bulk Batch Traceability Board (8768285252) ← Primary target
└── Production Board (9304930311)
```

### **Step 3: Smart Status Check**
For each connected item (especially Bulk Batch):
- Get ALL EPO connections for that item
- Check if ALL EPOs are either:
  - ✅ "QA Passed" OR
  - ✅ "Cancelled" (excluded from requirements)
- If yes → Update to "To Do"

### **Step 4: Targeted Updates**
- Only update items connected to the triggered EPO
- Skip items already "To Do" or "Done"
- Log which EPO triggered the update

## 🛠️ **IMPLEMENTATION CHANGES NEEDED**

### **1. Enhanced Webhook Handler**
```javascript
// Current: Broad automation trigger
if (body.event?.value?.label?.text === 'QA Passed') {
  await runEPOBulkAutomation(); // ← Processes ALL 95 items
}

// NEW: Targeted processing
if (['QA Passed', 'Cancelled'].includes(body.event?.value?.label?.text)) {
  const epoItemId = body.event.pulseId;
  await processEPOConnections(epoItemId); // ← Process only connected items
}
```

### **2. New Function: processEPOConnections(epoId)**
```javascript
async function processEPOConnections(epoId) {
  // 1. Find what boards this EPO connects to
  // 2. Get all items on those boards connected to this EPO  
  // 3. For each connected item, check if ALL its EPOs are ready
  // 4. Update items that are now ready to "To Do"
}
```

### **3. Enhanced Status Logic**
```javascript
// Current: Only "QA Passed" counts
if (epoStatus === 'QA Passed') qaPassedCount++;

// NEW: "QA Passed" OR "Cancelled" both count as "ready"
if (['QA Passed', 'Cancelled'].includes(epoStatus)) readyCount++;
```

## 📋 **CURRENT STATUS**

### ✅ **Already Built & Working**
- Monday.com GraphQL integration with board relations (CRITICAL BREAKTHROUGH)
- Core automation logic that finds EPO connections
- Fly.io deployment configuration  
- HTTP API endpoints
- Comprehensive error handling and logging

### 🔄 **Needs Refinement**
- Webhook logic: Broad sweep → Targeted processing
- Status logic: Add "Cancelled" as acceptable status
- Efficiency: Process 1-5 items instead of 95+ items per trigger

## 🎯 **NEXT SESSION TASKS**

### **1. Refine Webhook Logic**
- Update POST handler to extract `pulseId` from webhook
- Create `processEPOConnections(epoId)` function
- Add "Cancelled" status to acceptable conditions

### **2. Deploy & Test**
- Deploy refined automation to Fly.io
- Set up Monday.com webhook on EPO board
- Test with real EPO status changes

### **3. Monitor & Validate**
- Test webhook with "QA Passed" EPO changes
- Test webhook with "Cancelled" EPO changes  
- Verify only connected bulk items are processed
- Confirm efficiency improvements

## 🔍 **KEY TECHNICAL CONTEXT**

### **Critical GraphQL Discovery (Don't Lose This!)**
Board relations require special fragments:
```graphql
column_values {
  ... on BoardRelationValue {
    linked_items { id name }
  }
}
```
**Documented in `docs/monday-board-relations-guide.md`**

### **Board Configuration (Confirmed Working)**
- **EPO Board**: 9387127195 (deal_stage column, "QA Passed" = index 11)
- **Bulk Board**: 8768285252 (color_mkpbpmsh column, "To Do" = index 8)
- **Connection**: board_relation_mks3g2kq verified working

### **Current Test Results**
- Found 15+ bulk items with EPO connections
- WO-001297 Helios: 1 EPO (PO-000519) status "Reaching out to Vendor"
- Captain Blankenship: 3-15 EPO connections each
- All logic working correctly with current broad approach

## 💡 **EFFICIENCY GAINS EXPECTED**
- **Current**: Process 95 bulk items every trigger
- **New**: Process 1-5 bulk items per EPO change
- **Webhook frequency**: Real-time instead of 10-minute intervals
- **Resource usage**: Dramatically reduced processing per event

## 🚀 **READY TO REFINE & DEPLOY**

The foundation is solid with the Monday.com GraphQL breakthrough. Now we just need to:
1. Make the webhook processing more targeted and efficient
2. Add "Cancelled" status support  
3. Deploy and test the refined system

**Start the next session with: "Let's refine the EPO webhook logic to be more targeted and efficient, then deploy to production."**