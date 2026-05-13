const fs = require('fs');
let code = fs.readFileSync('src/ProceduresView.tsx', 'utf8');

const targetImports = `} from "firebase/firestore";
import { db } from "./services/firebase";`;

const repImports = `} from "firebase/firestore";
import { db } from "./services/firebase";
import { getPlanLimits } from "./utils/planLimits";`;

code = code.replace(targetImports, repImports);

const targetBtn = `<button
          onClick={() => {
            if (!selectedClientId) return alert("Seleccione un cliente primero.");
            setIsModalOpen(true);
          }}
          className="bg-slate-900 text-white px-6 py-4 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-800 transition-colors flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20"
        >
          <Plus size={16} /> Crear PTS
        </button>`;

const repBtn = `<button
          onClick={() => {
            if (!selectedClientId) return alert("Seleccione un cliente primero.");
            if (userPlan && !userPlan.isTrialActive) {
              if (procedures.length >= getPlanLimits(userPlan).maxReports) {
                alert("Límite de procedimientos alcanzado para tu plan actual. Actualiza tu plan para crear ilimitados.");
                return;
              }
            }
            setIsModalOpen(true);
          }}
          disabled={userPlan && !userPlan.isTrialActive && (procedures.length >= getPlanLimits(userPlan).maxReports)}
          className="bg-slate-900 text-white px-6 py-4 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-800 transition-colors flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:bg-slate-400"
        >
          {userPlan && !userPlan.isTrialActive && (procedures.length >= getPlanLimits(userPlan).maxReports) ? (
             <>Bloqueado por Plan</>
          ) : (
             <><Plus size={16} /> Crear PTS</>
          )}
        </button>`;

code = code.replace(targetBtn, repBtn);

fs.writeFileSync('src/ProceduresView.tsx', code);
console.log("Added plan limits to ProceduresView");
