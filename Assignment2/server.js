const http=require("http"),fs=require("fs"),path=require("path"),url=require("url");

const PORT=3000,ROOT=__dirname,DATA_DIR=path.join(ROOT,"data"),DATA_FILE=path.join(DATA_DIR,"requests.json");

if(!fs.existsSync(DATA_DIR))fs.mkdirSync(DATA_DIR,{recursive:true});
if(!fs.existsSync(DATA_FILE))fs.writeFileSync(DATA_FILE,"[]","utf8");

function sendJSON(res,status,data){
    res.writeHead(status,{
        "Content-Type":"application/json",
        "Access-Control-Allow-Origin":"*"
    });
    res.end(JSON.stringify(data));
}

function readRequests(){
    try{
        return JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));
    }catch(error){
        return [];
    }
}

function saveRequests(requests){
    fs.writeFileSync(DATA_FILE,JSON.stringify(requests,null,4),"utf8");
}

function getNextRequestId(requests){
    if(!requests.length)return "REQ001";

    let max=0;

    requests.forEach(r=>{
        const m=r.reqId&&r.reqId.match(/^REQ(\d+)$/);

        if(m){
            max=Math.max(max,Number(m[1]));
        }
    });

    return "REQ"+String(max+1).padStart(3,"0");
}

function getToday(){
    const today=new Date();
    const month=String(today.getMonth()+1).padStart(2,"0");
    const day=String(today.getDate()).padStart(2,"0");
    return `${today.getFullYear()}-${month}-${day}`;
}

function validateRequest(data){
    if(!data.customerName)
        return "Customer name is required.";

    if(!/^[0-9]{10}$/.test(data.phone))
        return "Phone number must contain exactly 10 digits.";

    if(!Number.isFinite(data.hallLength)||data.hallLength<=0)
        return "Hall length must be greater than 0.";

    if(!Number.isFinite(data.hallWidth)||data.hallWidth<=0)
        return "Hall width must be greater than 0.";

    if(!Number.isInteger(data.tableCount)||data.tableCount<1||data.tableCount>100)
        return "Table count must be between 1 and 100.";

    if(!Number.isInteger(data.chairsPerTable)||data.chairsPerTable<1||data.chairsPerTable>12)
        return "Chairs per table must be between 1 and 12.";

    if(!data.eventDay)
        return "Event day is required.";

    if(!data.eventDate)
        return "Event date is required.";

    if(data.eventDate<getToday())
        return "Event date cannot be in the past.";

    if(!["automatic","compact","spacious"].includes(data.layoutPreference))
        return "Invalid layout preference.";

    if(!["Yes","No"].includes(data.remarksRequired))
        return "Invalid remarks option.";

    return null;
}

function getLayoutColumns(tableCount) {
    const count = Number(tableCount) || 1;
    if (count <= 2) return { compact: count, balanced: count, spacious: 1 };
    if (count <= 4) return { compact: count, balanced: 2, spacious: 1 };
    if (count <= 6) return { compact: 3, balanced: 2, spacious: 2 };
    if (count <= 12) return { compact: 4, balanced: 3, spacious: 2 };
    if (count <= 20) return { compact: 5, balanced: 4, spacious: 3 };
    const base = Math.round(Math.sqrt(count));
    return { compact: Math.max(4, base + 2), balanced: Math.max(3, base + 1), spacious: Math.max(2, base - 1) };
}

function generateLayouts(data){
    const {hallLength,hallWidth,tableCount}=data;
    const layouts=[];
    const colConfig = getLayoutColumns(tableCount);

    const configurations=[
        {
            type:"compact",
            name:"Compact Layout",
            badge:`${colConfig.compact} Columns - High Density`,
            description:"Tables arranged in dense, space-saving rows to maximize hall capacity.",
            columns:colConfig.compact,
            spacingLength:2.2,
            spacingWidth:1.6,
            gap:8,
            style:{
                tableWidth:42,
                tableHeight:28,
                chairWidth:10,
                chairHeight:8,
                chairGap:3
            }
        },
        {
            type:"balanced",
            name:"Balanced Layout",
            badge:`${colConfig.balanced} Columns - Center Aisle`,
            description:"Evenly distributed tables separated by a central walking aisle for easy movement.",
            columns:colConfig.balanced,
            spacingLength:2.8,
            spacingWidth:2.2,
            gap:16,
            style:{
                tableWidth:52,
                tableHeight:34,
                chairWidth:13,
                chairHeight:10,
                chairGap:4
            }
        },
        {
            type:"spacious",
            name:"Spacious Layout",
            badge:`${colConfig.spacious} Columns - Wide Corridors`,
            description:"Fewer tables per row with wide perimeter aisles for premium comfort.",
            columns:colConfig.spacious,
            spacingLength:3.6,
            spacingWidth:2.8,
            gap:28,
            style:{
                tableWidth:68,
                tableHeight:44,
                chairWidth:16,
                chairHeight:12,
                chairGap:6
            }
        }
    ];

    configurations.forEach(c=>{
        const columns=Math.max(1,Math.min(tableCount,c.columns));
        const rows=Math.ceil(tableCount/columns);

        const usedLength=columns*c.spacingLength;
        const usedWidth=rows*c.spacingWidth;

        layouts.push({
            type:c.type,
            name:c.name,
            badge:c.badge,
            description:c.description,
            possible:usedLength<=hallLength&&usedWidth<=hallWidth,
            tableCount,
            columns,
            rows,
            gap:c.gap,
            usedLength:Number(usedLength.toFixed(1)),
            usedWidth:Number(usedWidth.toFixed(1)),
            style:c.style
        });
    });

    if(data.layoutPreference!=="automatic"){
        const preferred=
            data.layoutPreference==="compact"
                ?"Compact Layout"
                :"Spacious Layout";

        layouts.sort((a,b)=>
            a.name===preferred
                ?-1
                :b.name===preferred
                    ?1
                    :0
        );
    }

    return layouts;
}

function serveStaticFile(req,res){
    let filePath=url.parse(req.url).pathname;

    if(filePath==="/")
        filePath="/index.html";

    const fullPath=path.join(ROOT,filePath);

    if(!fullPath.startsWith(ROOT)){
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    fs.readFile(fullPath,(error,content)=>{
        if(error){
            res.writeHead(404);
            res.end("File not found");
            return;
        }

        const types={
            ".html":"text/html",
            ".css":"text/css",
            ".js":"application/javascript",
            ".json":"application/json"
        };

        res.writeHead(200,{
            "Content-Type":types[path.extname(fullPath)]||"text/plain"
        });

        res.end(content);
    });
}

const server=http.createServer((req,res)=>{

     if(req.method==="POST"&&req.url==="/api/layouts"){
        let body="";

        req.on("data",chunk=>{
            body+=chunk;
        });

        req.on("end",()=>{
            try{
                const data=JSON.parse(body);
                const error=validateRequest(data);

                if(error){
                    sendJSON(res,400,{success:false,message:error});
                    return;
                }

                sendJSON(res,200,{success:true,layouts:generateLayouts(data)});
            }catch(error){
                sendJSON(res,400,{success:false,message:"Invalid JSON request."});
            }
        });

        return;
    }

    if(req.method==="POST"&&req.url==="/api/requests"){
        let body="";

        req.on("data",chunk=>{
            body+=chunk;
        });

        req.on("end",()=>{
            try{
                const data=JSON.parse(body);
                const error=validateRequest(data);

                if(error){
                    sendJSON(res,400,{
                        success:false,
                        message:error
                    });
                    return;
                }

                const requests=readRequests();
                const reqId=getNextRequestId(requests);
                const layouts=generateLayouts(data);

                const request={
                    reqId,
                    customerName:data.customerName,
                    phone:data.phone,
                    hallLength:data.hallLength,
                    hallWidth:data.hallWidth,
                    tableCount:data.tableCount,
                    chairsPerTable:data.chairsPerTable,
                    totalChairs:data.tableCount*data.chairsPerTable,
                    eventDay:data.eventDay,
                    eventDate:data.eventDate,
                    layoutPreference:data.layoutPreference,
                    remarksRequired:data.remarksRequired,
                    remarks:data.remarks||"",
                    admin:"Admin",
                    submittedAt:new Date().toISOString(),
                    layouts:Array.isArray(data.layouts)?data.layouts:layouts,
                    selectedLayout:data.selectedLayout||layouts[0]?.name
                };

                requests.push(request);
                saveRequests(requests);

                sendJSON(res,201,{
                    success:true,
                    message:"Request saved successfully.",
                    request,
                    layouts
                });

            }catch(error){
                sendJSON(res,400,{
                    success:false,
                    message:"Invalid JSON request."
                });
            }
        });

        return;
    }

    if(req.method==="GET"&&req.url==="/api/requests"){
        sendJSON(res,200,readRequests());
        return;
    }

    serveStaticFile(req,res);
    });

server.listen(PORT,()=>{
    console.log(
        `Dining Management System running at http://localhost:${PORT}`
    );
});