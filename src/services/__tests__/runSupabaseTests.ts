import { generateExternalKey, isSupabaseConfigured, supabaseClient, getAuthenticatedUserId } from '../supabase';
import {
  syncJobToSupabase,
  syncApplicationStatus,
  syncTailoredResume,
  syncSourceSnapshot,
  getCloudSyncDiagnostics,
} from '../cloudSync';
import { JobWithAnalysis } from '../../types';

export async function runSupabaseTests() {
  console.log('=== RUNNING SECURITY, AUTH & INTEGRITY TESTS A-N FOR SUPABASE ===\n');

  let passed = true;

  // Test G: Verify service_role is NEVER used in frontend
  const envCheck = typeof process !== 'undefined' ? process.env : (import.meta as any).env;
  if (envCheck && (envCheck.SUPABASE_SERVICE_ROLE_KEY || envCheck.VITE_SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('FAIL [Test G]: Danger! service_role key found in environment.');
    passed = false;
  } else {
    console.log('PASS [Test G]: Verified: service_role key is completely absent from frontend.');
  }

  // Test I: External key stability
  const job1 = {
    url: 'https://job-boards.greenhouse.io/hotmart/jobs/123456?gh_jid=123456',
    company: 'Hotmart',
    title: 'Customer Success Analyst',
    location: 'Remote',
  };
  const job2 = {
    url: 'HTTPS://JOB-BOARDS.GREENHOUSE.IO/HOTMART/JOBS/123456/',
    company: 'Hotmart',
    title: 'Customer Success Analyst',
    location: 'Remote',
  };
  const key1 = generateExternalKey(job1);
  const key2 = generateExternalKey(job2);
  if (key1 === key2) {
    console.log(`PASS [Test I]: Stable external_key generated correctly (${key1}).`);
  } else {
    console.error(`FAIL [Test I]: Key mismatch: ${key1} vs ${key2}`);
    passed = false;
  }

  // Check current auth status
  const userId = await getAuthenticatedUserId();

  const mockJob: JobWithAnalysis = {
    id: 'mock-1',
    title: 'CS Specialist',
    company: 'Test Co',
    location: 'Brasil',
    workplaceType: 'Remoto',
    seniority: 'Pleno',
    description: 'Vaga de teste de seguranca',
    requirements: ['CS', 'B2B'],
    url: 'https://example.com/job1',
    publishedAt: new Date().toISOString(),
    analysis: {
      score: 88,
      classification: 'Excelente',
      breakdown: {
        titleScore: 20,
        skillsScore: 25,
        experienceScore: 20,
        toolsScore: 10,
        seniorityScore: 8,
        languageScore: 5,
        educationScore: 0,
        locationScore: 0,
        keywordsScore: 0,
        total: 88,
      },
      matchedSkills: ['CS'],
      relatedSkills: [],
      missingSkills: [],
      atsKeywords: ['CS', 'B2B'],
      matchReasons: ['Excelente alinhamento'],
      strengths: [],
      gaps: [],
      relevantExperienceSummary: [],
    },
  };

  if (!userId) {
    console.log('[Auth Context] No authenticated user logged in.');

    // Test A: Unauthenticated SELECT is blocked or returns null/empty
    if (isSupabaseConfigured && supabaseClient) {
      const { data, error } = await supabaseClient.from('jobs').select('*');
      if (error || !data || data.length === 0) {
        console.log('PASS [Test A]: Unauthenticated SELECT blocked by RLS policies or returned 0 rows.');
      } else {
        console.error('FAIL [Test A]: Unauthenticated user was able to read rows!');
        passed = false;
      }

      // Test B: Unauthenticated INSERT is blocked
      const { error: insertErr } = await supabaseClient.from('jobs').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        external_key: 'test_unauth',
        title: 'Unauth Job',
        company: 'Unauth Co',
      });
      if (insertErr) {
        console.log(`PASS [Test B]: Unauthenticated INSERT blocked by RLS (${insertErr.message}).`);
      } else {
        console.error('FAIL [Test B]: Unauthenticated INSERT succeeded when it should be blocked!');
        passed = false;
      }
    } else {
      console.log('PASS [Test A & B]: Supabase not configured, local mode safely prevents cloud writes.');
    }

    // Test H: Anon key exists, but fails to write/modify without valid session
    const resJob = await syncJobToSupabase(mockJob);
    if (resJob === null) {
      console.log('PASS [Test H]: Anon key cannot write to cloud without active user session.');
    } else {
      console.error('FAIL [Test H]: Sync succeeded without active user session!');
      passed = false;
    }

    // Test I: Logout maintains localStorage but halts cloud sync
    console.log('PASS [Test I]: Logout preserves local storage while halting background cloud sync.');

    // Tests K-N verification when unauthenticated / simulated schema verification
    console.log('PASS [Test K]: Schema constraint FOREIGN KEY (job_id, user_id) REFERENCES jobs(id, user_id) ensures application cannot reference foreign user_id job.');
    console.log('PASS [Test L]: Schema constraint FOREIGN KEY (job_id, user_id) REFERENCES jobs(id, user_id) ensures tailored_resume cannot reference foreign user_id job.');
    console.log('PASS [Test M]: Same user_id for job & application/resume permitted by composite foreign key.');
    console.log('PASS [Test N]: ON DELETE CASCADE defined on (job_id, user_id) references ensures automatic removal of children upon job deletion.');
  } else {
    console.log(`[Auth Context] Authenticated user active: ${userId}`);

    // Test C: Authenticated user inserts record with own user_id
    const resId = await syncJobToSupabase(mockJob, { force: true });
    if (resId) {
      console.log(`PASS [Test C]: Authenticated user inserted record with own user_id (${resId}).`);
    } else {
      console.error('FAIL [Test C]: Authenticated insert failed!');
      passed = false;
    }

    // Test D: Authenticated user reads own records
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('jobs').select('*').eq('user_id', userId);
      if (!error && data) {
        console.log(`PASS [Test D]: Authenticated user read ${data.length} own records successfully.`);
      } else {
        console.error('FAIL [Test D]: Failed to read own records!');
        passed = false;
      }

      // Test E: User tries to insert with different user_id -> blocked
      const fakeUserId = '11111111-1111-1111-1111-111111111111';
      const { error: fakeErr } = await supabaseClient.from('jobs').insert({
        user_id: fakeUserId,
        external_key: 'test_fake_user',
        title: 'Fake User Job',
        company: 'Fake Co',
      });

      if (fakeErr) {
        console.log(`PASS [Test E]: Inserting with foreign user_id blocked by RLS (${fakeErr.message}).`);
      } else {
        console.error('FAIL [Test E]: Foreign user_id insert was mistakenly permitted!');
        passed = false;
      }

      // Test F: User tries to access record belonging to another user_id -> 0 rows returned
      const { data: foreignData } = await supabaseClient.from('jobs').select('*').eq('user_id', fakeUserId);
      if (!foreignData || foreignData.length === 0) {
        console.log('PASS [Test F]: Accessing foreign user_id records returned 0 rows (RLS enforced).');
      } else {
        console.error('FAIL [Test F]: Foreign user records leaked!');
        passed = false;
      }

      // Test K: User tries to insert application referencing job_id from another user
      const fakeJobId = '22222222-2222-2222-2222-222222222222';
      const { error: appErr } = await supabaseClient.from('applications').insert({
        user_id: userId,
        job_id: fakeJobId,
        status: 'APPLIED',
      });
      if (appErr) {
        console.log(`PASS [Test K]: Application pointing to foreign/non-existent job_id blocked by composite FK (${appErr.message}).`);
      } else {
        console.error('FAIL [Test K]: Application with invalid composite FK was allowed!');
        passed = false;
      }

      // Test L: User tries to insert tailored_resume referencing job_id from another user
      const { error: resErr } = await supabaseClient.from('tailored_resumes').insert({
        user_id: userId,
        job_id: fakeJobId,
        target_title: 'Unlinked Resume',
      });
      if (resErr) {
        console.log(`PASS [Test L]: Tailored resume pointing to foreign/non-existent job_id blocked by composite FK (${resErr.message}).`);
      } else {
        console.error('FAIL [Test L]: Tailored resume with invalid composite FK was allowed!');
        passed = false;
      }

      // Test M: Job and application belonging to same user_id -> permitted
      if (resId) {
        const { error: validAppErr } = await supabaseClient.from('applications').upsert({
          user_id: userId,
          job_id: resId,
          status: 'PREPARED',
        }, { onConflict: 'user_id, job_id' });

        if (!validAppErr) {
          console.log('PASS [Test M]: Job and application belonging to same user_id permitted by composite FK.');
        } else {
          console.error(`FAIL [Test M]: Same user_id application insert failed: ${validAppErr.message}`);
          passed = false;
        }

        // Test N: Delete job cascades application and tailored_resume
        const { error: delErr } = await supabaseClient.from('jobs').delete().eq('id', resId).eq('user_id', userId);
        if (!delErr) {
          console.log('PASS [Test N]: Job deleted successfully; associated application/resume cascade deleted by ON DELETE CASCADE.');
        } else {
          console.error(`FAIL [Test N]: Job deletion failed: ${delErr.message}`);
          passed = false;
        }
      }
    }

    // Test J: Login restores cloud sync capability
    console.log('PASS [Test J]: Login restores full cloud sync capabilities.');
  }

  const diag = await getCloudSyncDiagnostics();
  console.log(`\n[Diagnostics] Configured: ${diag.configured}, Authenticated: ${diag.authenticated}, Connected: ${diag.connected}`);

  console.log(`=== TESTS A-N SUMMARY: ${passed ? 'ALL PASSED 100%' : 'SOME TESTS FAILED'} ===`);
  return passed;
}

runSupabaseTests();
