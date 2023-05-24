import {firefox} from 'playwright'; 
import fs from 'fs'; //for working with files
import { getDatabase, ref, child, set } from "firebase/database";
//import express from 'express';
// Initialize Firebase
import { app, auth, cpfLatam, senhaLatam }  from './firebase.js';
import { signInWithEmailAndPassword } from "firebase/auth";

signInWithEmailAndPassword(auth, 'oliveira.sergio@gmail.com', 'kedma256')

const dbRef = ref(getDatabase(app));
const datetoDate = (dia) => new Date(dia * 3600000 * 24 + 1)
const sleep = ms => new Promise(r => setTimeout(r, ms));

const hj = () => (new Date().getTime()/86400000)|0

//save cookie function 
const saveCookie = async (context) => {
    const cookies = await context.cookies();
    const cookieJson = JSON.stringify(cookies, null, 2);
    fs.writeFile(`cookies.json`, cookieJson, (err) => {
      if (err)
        console.log(err);
    });
  }
  
  //load cookie function
  const loadCookie = async (context) => {
    try {
      const cookieJson = fs.readFileSync(`cookies.json`);
      const cookies = JSON.parse(cookieJson);
      await context.addCookies(cookies);
    } catch(e) {
      console.log(e.message)
    }
  }
  
const getAzul = async (page, day, inter, origem, destino) => {

    const dia = datetoDate(day)
    for (let i = 0; i < inter; i++){
        try {
          await page.goto(`https://www.voeazul.com.br/br/pt/home/selecao-voo?c[0].ds=${origem}&c[0].std=${dia.getMonth()+1}/${dia.getDate()+i}/${dia.getFullYear()}&c[0].as=${destino}&p[0].t=ADT&p[0].c=1&p[0].cp=false&f.dl=3&f.dr=3&cc=PTS`)
          const indis = page.getByText('não temos voos disponíveis')
        //  await page.waitForSelector('.css-q4o408')
          const achou = page.waitForSelector('.css-q4o408')
          await Promise.any([indis.waitFor(), achou])
          if (await indis.isVisible())
            break;
          const valoresS = await page.locator('.css-q4o408').evaluateAll(nodes => nodes.map(node => node.firstChild.data))
          const valoresI =  valoresS.map(v => parseInt(v.replace('.', '')))
          set(child(dbRef, `/fl/${origem}/${destino}/${day+i}/${hj()}/Azul`), (valoresI.sort((a,b) => a - b))[0])
        } catch(e) {
          console.log('Não pegou Azul:', e.message)
        }
    }
}
    
var startSmiles = false;

const getSmiles = async (page, dia, inter, origem, destino) => {

  const data = datetoDate(dia)

  try {
    await page.goto(`https://www.smiles.com.br/mfe/emissao-passagem/?adults=1&cabin=ALL&children=0&departureDate=${data.getTime()}&infants=0&isElegible=false&isFlexibleDateChecked=false&returnDate=&searchType=g3&segments=1&tripType=2&originAirport=${origem}&originCity=&originCountry=&originAirportIsAny=false&destinationAirport=${destino}&destinCity=&destinCountry=&destinAirportIsAny=false&novo-resultado-voos=true`, 
                    {waitUntil: 'networkidle0'})

    if (!startSmiles) { 
      const close = await page.$('.img-close')
      if (close){
        await close.click()
        await new Promise(r => setTimeout(r, 800))
      }
      startSmiles = true
    }

    for (let i = 0; i < inter; i++){ 
        let valoresI = [], valoresS;

        await page.waitForSelector('.select-flight-list') 

        // Busca voos Gol
        valoresS = await page.locator('.price-and-seats').allInnerTexts()
  //	  valoresS = await page.$$eval('.price-and-seats', nodes => nodes.map(node => node.innerText))
        if (valoresS && valoresS.length > 0)
          valoresI = valoresS.map(v => parseInt(v.substr(12,7).replace('.', '')))

        const cias = page.locator('.select-flight-header-company-button.button-pill').all()
        if (cias.length > 1){ // Busca voos de outras cias
          await cias[1].click()
          await new Promise(r => setTimeout(r, 1000))
          await page.waitForSelector('.select-flight-list') 
        }

        valoresS = await page.locator('.price-and-seats').allInnerTexts()
            //	  valoresS = await page.$$eval('.price-and-seats', nodes => nodes.map(node => node.innerText))
        if (valoresS && valoresS.length > 0) 
          valoresI.push(...valoresS.map(v => parseInt(v.substr(12,7).replace('.', ''))))
        
        if (valoresI && valoresI.length > 0)
          set(child(dbRef, `/fl/${origem}/${destino}/${dia+i}/${hj()}/Smiles`), (valoresI.sort((a,b) => a - b))[0])

        if (i < inter-1) { 
          const dias = await page.locator('.slick-slide.slick-active').all()
          if (dias.length > 4){
            await dias[4].click()
            await new Promise(r => setTimeout(r, 5000))
          }
        }
    } 
  } catch(e) {'Smiles: ', console.log(e)}
}

const getInterline = async (page, day, inter, origem, destino) => {

  const dia = datetoDate(day)

  await page.goto(`https://interline.tudoazul.com/flights/OW/${origem}/${destino}/-/-/${dia.getFullYear()}-${dia.getMonth() + 1}-${dia.getDate()}/-/1/0/0/0/0/ALL/F/ECONOMY/-/-/-/-/A/-`)
  for (let i = 0; i < inter; i++){
    try {
      await page.waitForSelector('#btnPrice-selectEconomy')
      // ou 'não conseguimos processar sua solicitação' ou 'não há voos disponíveis'
      let valoresS =  await page.locator('#btnPrice-selectEconomy').allInnerTexts()
      let valoresI = valoresS.map(v => parseInt(v.replace('.', '')))
      set(child(dbRef, `/fl/${origem}/${destino}/${day+i}/${hj()}/Interline`), (valoresI.sort((a,b) => a - b))[0])
      
      if (i < inter-1) { 
        let prox = await page.waitForSelector('#id-flight-dates-4')
        await prox.click();
        await new Promise(r => setTimeout(r, 500))
      }
    } catch(e){
      console.log('Inteline: ', e.message)
    }
  }
}

const rodaDataLatam = async (page, dia) => {
  const rodar = Math.min((12 + dia.getMonth() - new Date(Date.now()).getMonth()) % 12, 9) 
  console.log(dia.getMonth(), rodar)
  await page.waitForSelector('.DayPickerNavigation_svg__horizontal.DayPickerNavigation_svg__horizontal_1')
  for (let i=0; i < rodar; i++){
      await page.getByRole('button', { name: 'Avance para o mês de' }).click();
      await sleep(200)
  }
}

const pesquisaLatamComum = (page, origem, destino, idaVolta) => 
  page.waitForSelector('#txtInputOrigin_field')
    .then(() => page.locator('#txtInputOrigin_field').click({delay: 20}))
    .then(() => page.locator('#txtInputOrigin_field').type(origem, {delay: 20}))
    .then(() => page.waitForSelector('.sc-fguZLD'))
    .then(o => o.click({delay: 50}))
    .then(() => page.locator('#txtInputDestination_field').click({delay: 30}))
    .then(() => page.locator('#txtInputDestination_field').type(destino, {delay: 60}))
    .then(() => page.waitForSelector('.sc-fguZLD'))
    .then(() => page.getByText(`, ${destino} -`).click({delay: 60}))
    .then(() => page.locator('#get-redemption-checkbox').click({delay: 40}))
    .then(() => page.locator('#btnTripTypeCTA').click())
    .then(() => page.getByRole('button', { name: idaVolta ? 'Opção Ida e Volta.': 'Opção Somente ida.' }).click())
    .then(() => page.locator('#departureDate').click({delay: 30}))
    .catch(e => console.log('Erro nos campos: ', e.message))


const pesquisaLatam = async (page, origem, destino, idaVolta, dI, dV) =>  {
  try { 
      await pesquisaLatamComum(page, origem, destino, idaVolta)
      await rodaDataLatam(page, dI)
      const dIString = ' ' + dI.toLocaleDateString('pt-BR', {month: 'long',  day: 'numeric'})
      console.log(dIString)
      await page.getByRole('button', {name: new RegExp(dIString, 'i') }).click({timeout: 5000})
      if (idaVolta) {
        const dvString = ' ' + dV.toLocaleDateString('pt-BR', {month: 'long',  day: 'numeric'})
        await page.getByRole('button', {name: new RegExp(dvString, 'i') }).click({timeout: 5000})
        console.log(dvString)
      }
      await page.locator('#btnSearchCTA').click({delay: 50})
  } catch(e) {
      console.log('Erro nos campos: ', e.message)
  } 
}
  
const cookieLatam = (page) => 
  page.waitForSelector('#cookies-politics-button')
    .then( () => page.locator("#cookies-politics-button").click())
    .catch(e => console.log('Botão de Cookies: ', e.message))

const getValorLatam = (page) => 
  page.waitForSelector('.card-flightstyle__WrapperInfoTop-sc__sc-16r5pdw-14.kThKNx', {timeout: 60000})
    .then(() => page.$eval('.display-currencystyle__TextAmount-sc__sc-19mlo29-3.fhURPH.displayAmount', node => node.firstChild.innerText))
    .catch(e => console.log('Erro getValorLatam: ', e.message))

const logarLatam = (page, cpf, senha, idaVolta) =>
  page.waitForSelector('#header__profile__lnk-sign-in')
      .then(()=> page.getByText('Fazer login').click())
      .then(() => page.waitForSelector('#form-input--alias'))
      .then(usuario => usuario.type(cpf, {delay: 100}))
      .then(() => page.locator('#primary-button').click())
      .then(() => page.waitForSelector('#form-input--password'))
      .then(senhaI => senhaI.type(senha, {delay: 100}))
      .then(() => page.locator('#primary-button').click())
      .then(() => page.waitForLoadState())
      .then(() => sleep(1000))
      .catch(e =>  console.log('Não conseguiu logar:', e.message));


const addZ = num => num.toLocaleString('en-US', { // Coloca um zero no dia e mês quando menores que 10
  minimumIntegerDigits: 2,
  useGrouping: false
})

const getLatam = async (context, diaI, diaV, inter, origem, destino, idaVolta, first) => {
  const limite = 5
  let timeout = 0
  let link = null

  const dI = datetoDate(diaI)
  const dV = datetoDate(diaV)

  let page = context.pages()[0]
  try {
    await page.goto('https://www.latamairlines.com/br/pt', {waitUntil: 'domcontentloaded'})
    await page.waitForLoadState()

    if (first)
      await cookieLatam(page)

    const login = await page.waitForSelector('.sc-eilVRo.HndlC')
                        .then((c) => c.innerText())
    if (login.includes('Fazer login'))
        await logarLatam(page, cpfLatam, senhaLatam)

    if (first){ 
      const pagePromise = context.waitForEvent('page', {timeout: 120000});
      await pesquisaLatam(page, origem, destino, idaVolta, dI, dV)
      page = await pagePromise;
      await page.waitForLoadState();
    } else
      await pesquisaLatam(page, origem, destino, idaVolta, dI, dV)

    link = page.url();
  } catch(e) {
    console.log('Erro StartLatam: ', e.message)
    return
  }
  for (let i=1; i<=inter;i++){
    try {      
      // ida
      let valoresS = await getValorLatam(page)
      if (valoresS){
        set(child(dbRef, `/fl/${origem}/${destino}/${diaI+i-1}/${hj()}/Latam`), parseInt(valoresS.replace('.', '')))
        if (idaVolta){ 
          const painel = page.locator('.card-flightstyle__WrapperInfoTop-sc__sc-16r5pdw-14.kThKNx').first()
          if (painel)
              await painel.click()
          let light = await page.waitForSelector('#bundle-detail-0-flight-select--button-wrapper')
          if (light) 
              await light.click()
      
          // volta 
          valoresS = await getValorLatam(page)
          if (valoresS){
              set(child(dbRef, `/fl/${destino}/${origem}/${diaV+i-1}/${hj()}/Latam`), parseInt(valoresS.replace('.', '')))
          
          }
        }
      }

      if (i < inter) { 
          if (idaVolta){ 
              dI.setDate(dI.getDate() + 1)
              dV.setDate(dV.getDate() + 1)
              link = `https://www.latamairlines.com/br/pt/oferta-voos/?origin=${origem}&outbound=${dI.getFullYear()}-${addZ(dI.getMonth()+1)}-${addZ(dI.getDate())}T15%3A00%3A00.000Z&destination=${destino}&inbound=${dV.getFullYear()}-${addZ(dV.getMonth()+1)}-${addZ(dV.getDate())}T15%3A00%3A00.000Z&adt=1&chd=0&inf=0&trip=RT&cabin=Economy&redemption=true&sort=PRICE%2Casc`
              await page.goto(link, {waitUntil: 'networkidle0'})
          } else {
              await page.locator('#date-carousel-item-3').click()
              await sleep (500)
          }
      }
    } catch(err){
      console.log(err)
      await page.goto(link, {waitUntil: 'networkidle0'})
      if (timeout++ < limite)
        i--
    }
  }
}
    
  
export const getMiles = async (dd) => {
  const numPages = (dd.idaVolta)? 7 : 4
  const context = await startMiles(numPages)
  await findMiles(context, dd, true)
  await endMiles(context)
}

export const startMiles = async (numPages) => {

    // Launch the browser
    const browser = await firefox.launch({executablePath: '/ms-playwright/firefox-1403/firefox/firefox'}); 
//    const browser = await firefox.launch({headless:false}); 
    const context = await browser.newContext(); 
    await loadCookie(context)

    await context.grantPermissions(['geolocation', 'notifications']);
    //        URL                  An array of permissions
    //context.grantPermissions([]);
    // Configura a página default
    startSmiles = false; // Para buscar em vôos que não sejam Gol
    
    for (let i = 0; i < numPages; i++)
      await context.newPage();

    await context.route('**/*.{png,jpg,jpeg}', route => route.abort());

    return context;
}

export const findMiles = async (context, dd, first) => {

    const di = dd.di
    const dv = dd.dv
    const inter = dd.inter + 1 // Para a data em questão
    const pages = context.pages(); 

    let promessas = [
      getLatam(context, di, dv, inter, dd.origem, dd.destino, dd.idaVolta, first),
      getAzul(pages[1], di, inter, dd.origem, dd.destino),
      getSmiles(pages[2], di, inter, dd.origem, dd.destino),
      getInterline(pages[3], di, inter, dd.origem, dd.destino)
    ]
  
    if (dd.idaVolta) 
      promessas.push( 
        getAzul(pages[4], dv, inter, dd.destino, dd.origem),
        getSmiles(pages[5], dv, inter, dd.destino, dd.origem),
        getInterline(pages[6], dv, inter, dd.destino, dd.origem)
    )

    await Promise.all(promessas)
}

export const endMiles = async (context) => {
    await saveCookie(context)
    //await context.close();
    await context.browser().close();
  
  }