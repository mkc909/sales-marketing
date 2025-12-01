# TICKET-013: Resolve Multiple Cloudflare Accounts Architecture Issue

**Priority**: High  
**Date Created**: December 1, 2024  
**Status**: Open  
**Assignee**: DevOps  

## Problem Statement

The ProGeoData platform is currently split across multiple Cloudflare accounts, creating a disconnect between frontend and backend:

- **Frontend**: https://progeodata-com.auramediastudios.workers.dev (in separate account)
- **Backend API**: https://49dfd640.estateflow.pages.dev/api/professionals/search (in current account)

This separation prevents the frontend from accessing the fixed backend API, leaving users with mock data.

## Technical Details

### Current Architecture
```
┌─────────────────────────────────┐
│  Account A (mike@...)        │
│  ┌─────────────────────────┐  │
│  │ estateflow Pages       │  │
│  │ - D1 Database        │  │
│  │ - Working Search API   │  │
│  └─────────────────────────┘  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Account B (unknown)          │
│  ┌─────────────────────────┐  │
│  │ progeodata-com Worker  │  │
│  │ - Frontend Site      │  │
│  │ - Mock Data          │  │
│  └─────────────────────────┘  │
└─────────────────────────────────┘
```

### Working Backend
- ✅ API endpoint: https://49dfd640.estateflow.pages.dev/api/professionals/search
- ✅ Returns real agent data from D1 database
- ✅ Search functionality tested and working
- ✅ Database ID: 857b7e12-732f-4f8e-9c07-2f1482a5b76c

### Frontend Issues
- ❌ Cannot access working backend API
- ❌ Still showing mock "Sarah Jenkins" data
- ❌ Search not functional with real data

## Proposed Solutions

### Option 1: Unify Accounts (Recommended)
1. Transfer progeodata-com worker to current account
2. Update worker configuration to use existing D1 database
3. Deploy unified frontend+backend

**Pros**:
- Single account management
- Direct database access
- No CORS issues
- Simplified deployment

**Cons**:
- Need access to Account B
- Potential downtime during transfer

### Option 2: Update Frontend API Endpoint
1. Update frontend to call: https://49dfd640.estateflow.pages.dev/api/professionals/search
2. Handle CORS between workers.dev and pages.dev
3. Test integration

**Pros**:
- No account transfers needed
- Backend already working
- Quick fix

**Cons**:
- Cross-origin requests
- Separate domains
- Potential rate limiting

### Option 3: Create Dedicated ProGeoData Pages Project
1. Create new Pages project: progeodata-com
2. Deploy frontend as Pages site
3. Connect to existing backend API

**Pros**:
- Same account infrastructure
- Custom domain support
- Modern Pages features

**Cons**:
- Need to rebuild frontend for Pages
- Domain configuration required

## Implementation Plan

### Phase 1: Investigation (1 day)
- [ ] Identify which account owns progeodata-com worker
- [ ] Check if we have access to transfer
- [ ] Document all required resources

### Phase 2: Execute Solution (2-3 days)
Based on investigation results:

**If Option 1**:
- [ ] Initiate worker transfer
- [ ] Update wrangler.toml configuration
- [ ] Test database connectivity
- [ ] Deploy unified worker

**If Option 2**:
- [ ] Update frontend API calls
- [ ] Add CORS headers to backend
- [ ] Test cross-origin functionality
- [ ] Deploy updated frontend

**If Option 3**:
- [ ] Create progeodata-com Pages project
- [ ] Build frontend for Pages deployment
- [ ] Configure custom domain
- [ ] Deploy and test

### Phase 3: Verification (1 day)
- [ ] End-to-end testing
- [ ] Performance validation
- [ ] Documentation update
- [ ] Monitor for issues

## Success Criteria

1. ✅ Frontend displays real agent data (not mock)
2. ✅ Search functionality works with live data
3. ✅ No CORS or authentication errors
4. ✅ Single account management (if Option 1 or 3)
5. ✅ Custom domain resolves correctly

## Risks & Mitigations

| Risk                     | Impact | Mitigation                 |
| ------------------------ | ------ | -------------------------- |
| Account transfer failure | High   | Have Option 2 as fallback  |
| CORS issues              | Medium | Proper headers and testing |
| Domain downtime          | Medium | Plan maintenance window    |
| Data loss                | Low    | Use existing database      |

## Dependencies

- Access to Cloudflare Account B
- Domain configuration permissions
- SSL certificate management
- DNS access for custom domains

## Related Tickets

- [TICKET-012] ProGeoData Search API Fix (COMPLETED)
- [DEPLOYMENT_STATUS.md] Updated with current status

## Next Steps

1. **Immediate**: Determine which account owns progeodata-com worker
2. **Short-term**: Implement chosen solution
3. **Long-term**: Document unified architecture

---

**Ticket Created By**: System Admin  
**Last Updated**: December 1, 2024  
**Estimated Resolution**: December 5, 2024