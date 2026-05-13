const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetSidebar1 = `          <SidebarItem
            icon={CalendarDays}
            label="Carta Gantt"
            active={currentView === "gantt"}
            onClick={() => setCurrentView("gantt")}
            collapsed={sidebarCollapsed}
          />`;
const repSidebar1 = `          <SidebarItem
            icon={CalendarDays}
            label="Carta Gantt"
            active={currentView === "gantt"}
            onClick={() => setCurrentView("gantt")}
            collapsed={sidebarCollapsed}
          />
          <SidebarItem
            icon={FileText}
            label="Procedimientos"
            active={currentView === "procedures"}
            onClick={() => setCurrentView("procedures")}
            collapsed={sidebarCollapsed}
          />`;

code = code.replace(targetSidebar1, repSidebar1);

const targetMobile1 = `                <button
                  onClick={() => {
                    setCurrentView("gantt");
                    setIsMobileMenuOpen(false);
                  }}
                  className={\`w-full text-left font-bold text-lg py-2 flex items-center gap-4 \${currentView === "gantt" ? "text-orange-500" : "text-slate-700"}\`}
                >
                  <CalendarDays size={20} /> Carta Gantt
                </button>`;
const repMobile1 = `                <button
                  onClick={() => {
                    setCurrentView("gantt");
                    setIsMobileMenuOpen(false);
                  }}
                  className={\`w-full text-left font-bold text-lg py-2 flex items-center gap-4 \${currentView === "gantt" ? "text-orange-500" : "text-slate-700"}\`}
                >
                  <CalendarDays size={20} /> Carta Gantt
                </button>
                <div className="h-px bg-slate-200 my-4" />
                <button
                  onClick={() => {
                    setCurrentView("procedures");
                    setIsMobileMenuOpen(false);
                  }}
                  className={\`w-full text-left font-bold text-lg py-2 flex items-center gap-4 \${currentView === "procedures" ? "text-orange-500" : "text-slate-700"}\`}
                >
                  <FileText size={20} /> Procedimientos
                </button>`;

code = code.replace(targetMobile1, repMobile1);

const targetRender = `            {currentView === "settings" && <SettingsView user={user} />}`;
const repRender = `            {currentView === "settings" && <SettingsView user={user} />}
            {currentView === "procedures" && (
              <ProceduresView
                user={user}
                clients={clients}
                selectedClientId={selectedClientId}
                userPlan={userPlan}
                profile={profile}
              />
            )}`;

code = code.replace(targetRender, repRender);

fs.writeFileSync('src/App.tsx', code);
console.log("Added Procedures to UI navigation in App.tsx");
