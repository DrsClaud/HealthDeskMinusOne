# Port slice intake (solo)

Answer once per role/feature slice before or while you port. Use answers to decide what ships together and what your parity check must cover.

## Multiple choice

**1. Slice name / one-line scope**  
_(free text)_

**2. Which role(s) does this slice affect?**  
- [ ] patient  
- [ ] professional  
- [ ] facility  
- [ ] admin  
- [ ] other: _______________

**3. Firestore rules change?**  
- [ ] yes  
- [ ] no  
- [ ] need to check  

**4. New or changed composite / collection indexes?**  
- [ ] yes  
- [ ] no  
- [ ] need to check  

**5. Cloud Functions (or callables) touched?**  
- [ ] yes  
- [ ] no  
- [ ] need to check  

**6. When comparing Experimental vs MinusOne, Firebase backend is:**  
- [ ] same project, same collection paths (parity mostly UI + functions + rules)  
- [ ] same project, paths may differ _(plan align vs adapter—see plan doc)_  
- [ ] different projects _(seed data / expectations differ per app)_  

**7. Intentional differences vs Experimental for this slice**  
- [ ] none — should match behavior  
- [ ] copy/wording only  
- [ ] other: _______________

**8. Ship behind a feature flag first?**  
- [ ] yes  
- [ ] no  
- [ ] N/A  

**9. Slice “done” when:**  
- [ ] parity signal passes on **both** Experimental and MinusOne  
- [ ] parity passes on MinusOne only, after Experimental behavior frozen for these scenarios  
- [ ] other: _______________

**10. Primary parity automation for this slice** _(pick one; change next slice if needed)_  
- [ ] shared browser E2E (e.g. Playwright) on both base URLs  
- [ ] Firebase emulator / integration tests  
- [ ] API or callable smoke script  
- [ ] manual checklist only for this slice  

**11. Commands or tags** _(fill after you wire automation)_  
Experimental: _______________  
MinusOne: _______________

---

After the port: run the same parity signal on both apps, fix MinusOne until it passes, then optional one human pass for edge cases automation does not assert (e.g. permission boundaries).
