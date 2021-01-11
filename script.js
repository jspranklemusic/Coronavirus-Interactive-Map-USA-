
const app = Vue.createApp({
    data(){
        return{
            data:null,
            sliceRange:[0, 56],
            loading:true,
            bytes:0,
            selectedState:"CA",
            windowWidth:window.innerWidth,
            currentColor:'red',
            selectedOption:'dailyCases',

            descriptors:{
                dailyCases:70,
                totalCases:3,
                dailyDeaths:700,
                totalDeaths:40,
            },
            ratios:{
                dailyCases:10000,
                totalCases:900000,
                dailyDeaths:400,
                totalDeaths:20000,
            },
            lineRatios:{
                dailyCases:200,
                totalCases:8500,
                dailyDeaths:2.05,
                totalDeaths:115,
            }
        }
    },
    computed:{
        states(){
            let arr=[]
            this.selectedData.forEach(state=>{
                arr.push(state.state)
            })
            return arr
        },
        descriptor1(){
            let d = this.descriptors
            if(this.selectedOption == 'dailyCases') return [d.dailyCases,'k']
            if(this.selectedOption == 'totalCases') return [d.totalCases,' mil']
            if(this.selectedOption == 'dailyDeaths') return [d.dailyDeaths, ""]
            if(this.selectedOption == 'totalDeaths') return [d.totalDeaths,'k']
        },
        descriptor2(){
            let s = [...this.descriptor1]
            s[0] = (s[0]/2)
            return s
        },
        highestState(){
            return this.sortByCases()[0].state
        },
        selectedDataPerState(){
            return this.data.filter(state=>{
                return state.state==this.selectedState
            }).reverse()
        },
        dateSplit(){
            let string = JSON.stringify(this.currentDate)
            return string.slice(0,4)+"/"+string.slice(4,6)+"/"+string.slice(6,8)
        },
        selectedData(){
            if(this.data) return this.data.slice(this.sliceRange[0],this.sliceRange[1])
            else return [{
                state:"",
                recovered:"",
                death:"",
                deathIncrease:"",
                positiveIncrease:"",
                positive:""
            }]
            
            
        },
        currentDate(){
            if(this.data[this.sliceRange[0]]) return this.data[this.sliceRange[0]].date
            else return 99999999
        },
        dailyCases(){
            let cases=0
            this.selectedData.forEach(state=>{
                cases+=state.positiveIncrease
            })
            return cases
        },
        allCases(){
            let cases=0
            this.selectedData.forEach(state=>{
                cases+=state.positive
            })
            return cases
        },
        dailyDeaths(){
            let deaths=0
            this.selectedData.forEach(state=>{
                deaths+=state.deathIncrease
            })
            return deaths
        },
        allDeaths(){
            let deaths=0
            this.selectedData.forEach(state=>{
                deaths+=state.death
            })
            return deaths
        },
        stateData(){
            let ind = this.selectedData.findIndex(state=>state.state==this.selectedState)
            return this.selectedData[ind]
        },
        
        completionPercentage(){
            let perc = this.bytes/230000
            if(perc>100){
                perc=99
            }
            return parseInt(perc)
        }
    },
    watch:{
        selectedOption(){
            let s = this.selectedOption 
            if(s=='dailyCases' | s=='totalCases') this.colorMap('red')
            if(s=='dailyDeaths' | s=='totalDeaths') this.colorMap('black')
            
        }
    },
    methods:{
        zoomIn(){
                for(let key in this.lineRatios){
                    this.lineRatios[key]=this.lineRatios[key]/2
                }
                for(let key in this.descriptors){
                    this.descriptors[key]=this.descriptors[key]/2
                }
     
        },
        zoomOut(){
                for(let key in this.lineRatios){
                    this.lineRatios[key]=this.lineRatios[key]*2
                }
                for(let key in this.descriptors){
                    this.descriptors[key]=this.descriptors[key]*2
                }   
        },
        colorMap(color){
            let r = this.ratios
            document.querySelectorAll('path').forEach(path=>{
                let s = path.style
                //compare states on the ID map with fetched data
                let ind = this.selectedData.findIndex(state=>state.state==path.id)
                //logic for coloring
                let maxRatio = 1
                let minRatio = 0.001
                

                let ratio = this.selectedData[ind].positiveIncrease/r.dailyCases

                if(this.selectedOption=='totalDeaths') {
                    ratio = this.selectedData[ind].death/r.totalDeaths
                }
                if(this.selectedOption=='totalCases') {
                    ratio = this.selectedData[ind].positive/r.totalCases
                }
                if(this.selectedOption=='dailyDeaths') {
                    ratio = this.selectedData[ind].deathIncrease/r.dailyDeaths
                }
                

                if(ratio>maxRatio) ratio=maxRatio
                if(ratio<minRatio) ratio=minRatio

                if(color=="red"){
                    s.fill = `rgba(255, 0, 0, ${ratio})`
                }else if(color=="black"){
                    s.fill = `rgba(0, 0, 0, ${ratio})`
                }
                
            })
            document.getElementById(this.selectedState).style.fill='#427d48'
        },
        
        previousDate(){
            this.sliceRange[0]+=56
            this.sliceRange[1]+=56
            this.colorMap(this.currentColor)
        },
        nextDate(){
            if(this.sliceRange[0]==0) return
            this.sliceRange[0]-=56
            this.sliceRange[1]-=56
            this.colorMap(this.currentColor)
        },
        sortByCases(){
            return this.selectedData.sort((a,b)=>a.positiveIncrease<b.positiveIncrease)
        },
        zoom(){

        }
    },
    async mounted(){

        function removeFilters(){
            document.querySelectorAll('path').forEach(path=>{
                path.style.filter="none"
            })
        }

        const loadingBar = document.getElementById('loading-bar').style
        const response = await fetch("https://api.covidtracking.com/v1/states/daily.json")
        console.log(response.headers)

        const reader = response.body.getReader();

            // Step 2: get total length
            const contentLength = +response.headers.get('Content-Length');

            // Step 3: read the data
            // let receivedLength = 0; received that many bytes at the moment
            let chunks = []; // array of received binary chunks (comprises the body)
            while(true) {
            const {done, value} = await reader.read();

            if (done) {
                break;
            }

            chunks.push(value);
            this.bytes += value.length;
            loadingBar.width=`${this.bytes/80000}px`
            }

            // Step 4: concatenate chunks into single Uint8Array
            let chunksAll = new Uint8Array(this.bytes); // (4.1)
            let position = 0;
            for(let chunk of chunks) {
            chunksAll.set(chunk, position); // (4.2)
            position += chunk.length;
            }

            // Step 5: decode into a string
            let result = new TextDecoder("utf-8").decode(chunksAll);
            let parsedData = JSON.parse(result)
            

            
        
        if(response.ok){
           
        //    let data =  await response.json()
        //    function compare(a,b){
        //        return a.positiveIncrease < b.positiveIncrease
        //    }
           this.data = parsedData
           this.currentDate=parsedData[0].date
           this.loading=false
           this.selectedState = this.highestState
           setTimeout(()=>{
            document.querySelectorAll('path').forEach(path=>{
                path.setAttribute('highlighted',false)
                // let hlight = path.getAttribute('highlighted')
                let s = path.style
                s.transition="0.2s"
                s.cursor="pointer"

                path.addEventListener('click',()=>{
                    console.log(path.id)
                    this.selectedState=path.id
                    this.colorMap(this.currentColor)
                    s.fill="#427d48"
                })
    
            })
            this.colorMap(this.currentColor)

            
           },100)
           
        }else{
            console.log(response)
        }
       

       
       
    }
})

app.mount("#app")

   