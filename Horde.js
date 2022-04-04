const { clientId, guildId, token} = require('./config.json');
const Discord = require('discord.js');
const fs = require('fs');
const client = new Discord.Client({ intents: [
  "GUILDS" ,
  "GUILD_MEMBERS" ,
  "GUILD_INTEGRATIONS" ,
  "GUILD_MESSAGES" ,
  "GUILD_MESSAGE_REACTIONS"] });

const weapons = ["hammer", "sword", "guns", "lance", "spear", "katars", "axe", "bow", "gauntlets", "scythe", "cannon", "orb", "greatsword", "unarmed"]

client.once('ready', async () => {
  writePermissions();

  const pf = require('./players.json');
  const rrs = require('./rrs');
  const file = require('./challenges.json')
  client.guilds.cache.get(`887891951465140256`).channels.fetch('925055051473510411'); //bot-channel
  client.guilds.cache.get(`887891951465140256`).channels.fetch('953723070747664444'); //punishment-log

  for(var i = 0 ; i < pf.players.length ; i++){ //Fetches all users that are registered in the bot
    client.users.fetch(pf.players[i].id);
  }
  for(var i = 0 ; i < rrs.rrs.length ; i++){ //Fetches reaction roles
    client.guilds.cache.get(`887891951465140256`).channels.cache.get(rrs.rrs[i].channelid).messages.fetch(rrs.rrs[i].messageid);
  }
  for(var i = 0 ; i < file.challenges.length ; i++){ //Fetches challenge reactions
    client.guilds.cache.get(`887891951465140256`).channels.cache.get(file.challenges[i].channelId).messages.fetch(file.challenges[i].messageId);
  }
  //calculateReactions(); //This takes a long time and only needs to happen very occasionally, so I have it commented out 99% of the time
  ensureDuplicates();
  recalculatePoints();

  console.log('Ready!');
});

//Literally every single command in on event lol (I'm such a good coder!)
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

  console.log(`${interaction.commandName}:${interaction.commandId}`);

	const { commandName } = interaction;
  const file = require('./challenges.json');
  const pf = require('./players.json');
  const combos = require('./combos.json');
  const legends = require('./legends.json');
  const punishments = require('./punishments.json');

	if (commandName === 'addchallenge') {
    sortChallenges()
    const challengeName = interaction.options.getString("challenge_name");
    const points = interaction.options.getNumber("points")
    const channelId = interaction.options.getString("challenge_type")
    const messageId = interaction.options.getString("messageid")

    const output = {
      challengeName : challengeName ,
      points : points ,
      channelId : channelId ,
      messageId : messageId
    }
    file.challenges.push(output);
    fs.writeFile('./challenges.json', JSON.stringify(file , null , 2) , err => {
      if (err) {
        console.error(err)
        return
      }
    })

    message = await client.guilds.cache.get(`887891951465140256`).channels.cache.get(channelId).messages.fetch(messageId);
    message.react('✅');

    await interaction.reply(`Added '${challengeName}'`);

	}
  else if (commandName === 'listchallenges') {
    sortChallenges()
    var s = ``;
    if(interaction.options.getString('filter')){
      for(var i = 0 ; i < file.challenges.length ; i++){
        if(file.challenges[i].challengeName.startsWith(interaction.options.getString('filter')))
          s  = s + `${file.challenges[i].challengeName} **(${file.challenges[i].points})**\n`;
      }
    }else{
      s = `${file.challenges[0].challengeName} **(${file.challenges[0].points})**`
      for(var i = 1 ; i < file.challenges.length ; i++){
        s  = s + `\n${file.challenges[i].challengeName} **(${file.challenges[i].points})**`;
      }
    }
    embed = new Discord.MessageEmbed()
      .setTitle('**All Challenges**')
      .setColor("#91A6A6")
      .setThumbnail(client.user.avatarURL)
      .setDescription(s)
  interaction.reply({ embeds: [embed] });
  }
  else if (commandName === 'completechallenge'){
    //if(!(interaction.user.id == 293132125190750208 || interaction.user.id == 422184269025247233 || interaction.member.roles.cache.has(914379597045444618)) ) return;
    const player = interaction.options.getUser('player');
    const challengeToComplete = interaction.options.getString('challenge_name');

    completeChallenge(player , challengeToComplete , interaction , true , pf , file);
  }
  else if (commandName === 'decompletechallenge'){
    //if(!(interaction.user.id == 293132125190750208 || interaction.user.id == 422184269025247233 || interaction.member.roles.cache.has(914379597045444618)) ) return;
    console.log(`${interaction.user.username} used decompletechallenge`);
    const player = interaction.options.getUser('player');
    const challengeToDecomplete = interaction.options.getString('challenge_name');

    decompleteChallenge(player, challengeToDecomplete, interaction, true, pf, file);
  }
  else if (commandName === 'playerstats'){
    sortChallenges()
    var player = interaction.options.getUser("player");
    if(!player){
      player = interaction.user;
    }

    var s1 = '';
    var s2 = '';
    var playerIndex = -1;

    for(var i = 0 ; i < pf.players.length ; i++){
      if(pf.players[i].id == player.id){
        playerIndex = i;
        break;
      }
    }

    if(playerIndex == -1){
      interaction.reply('This player doesn\'t have any stats yet, complete a challenge to generate stats');
      return;
    }
    if(interaction.options.getString('filter')){
      for(var i = 0 ; i < file.challenges.length ; i++){
        if(file.challenges[i].challengeName.startsWith(interaction.options.getString('filter'))){
          var bool1 = false;
          for (var j = 0 ; j < pf.players[playerIndex].challenges.length ; j++){
            if(file.challenges[i].challengeName == pf.players[playerIndex].challenges[j].challengeName){
              bool1 = true;
            }
          }
          if(bool1){
            s1 += `${file.challenges[i].challengeName} **(${file.challenges[i].points})**\n`;
          }else{
            s2 += `${file.challenges[i].challengeName} **(${file.challenges[i].points})**\n`;
          }
        }
      }
    }else{
      for(var i = 0 ; i < file.challenges.length ; i++){
        var bool1 = false;
        for (var j = 0 ; j < pf.players[playerIndex].challenges.length ; j++){
          if(file.challenges[i].challengeName == pf.players[playerIndex].challenges[j].challengeName){
            bool1 = true;
          }
        }
        if(bool1){
          s1 += `${file.challenges[i].challengeName} **(${file.challenges[i].points})**\n`;
        }else{
          s2 += `${file.challenges[i].challengeName} **(${file.challenges[i].points})**\n`;
        }
      }
    }
    embedPoints = new Discord.MessageEmbed()
      .setTitle(`**${player.username}'s Stats**`)
      .setDescription(`Total Points: ${pf.players[playerIndex].points} \nRemaining HordeCoin: ${pf.players[playerIndex].points - pf.players[playerIndex].pointsSpent}`)
      .setColor("#0000FF")
    // embedFull = new Discord.MessageEmbed()
    //   .setTitle(`**${player.username}'s Stats**`)
    //   .setColor("#2B962B")
    //   .setThumbnail(player.displayAvatarURL())
    //   .setDescription(`Total Points: ${pf.players[playerIndex].points} \nRemaining HordeCoin: ${pf.players[playerIndex].points - pf.players[playerIndex].pointsSpent}`)
    // if(s1.length > 0){
    //   embedFull.addField("**Completed Challenges**", s1, true)
    // }else{
    //   embedFull.addField("**Completed Challenges**", "No completed challenges \n for this filter", true)
    // }
    // if(s2.length > 0){
    //   embedFull.addField("**Incompleted Challenges**", s2, true)
    // }else{
    //   embedFull.addField("**Incompleted Challenges**", "User has completed \nall challenges \n for this filter", true)
    // }

    embedComplete = new Discord.MessageEmbed()
      .setTitle('**Completed Challenges**')
      .setColor("#00FF00")
      .setDescription(s1)
    embedIncomplete = new Discord.MessageEmbed()
      .setTitle('**Incompleted Challenges**')
      .setColor("#FF0000")
      .setDescription(s2)

    interaction.reply({ embeds: [embedPoints , embedComplete, embedIncomplete] });
  }
  else if (commandName === 'leaderboard'){
    var page = interaction.options.getNumber('page');
    var pageCount = 20;
    if(!page){
      page = 1;
    }
    if(page == 0){
      pageCount = 1000;
    }
    function compare(a,b){
      if(a.points > b.points){
        return -1;
      }else if(b.points > a.points){
        return 1;
      }
      return 0;
    }

    pf.players.sort(compare);
    //console.log(client.users.cache);
    var s = ""
    s+= `**------------------------**\n`
    var count = 1;
    if(page < 0){
      interaction.reply(`Invalid page number. Enter a number >= 0`)
      return;
    }
    for(var i = 0 ; i < pf.players.length ; i++){
      if(client.users.cache.find(user => user.id == pf.players[i].id)){
        if(pf.players[i].id == interaction.user.id){
          if(count > page*pageCount){
            s+= `**------------------------**\n`
          }
          s += `**${count}. ${client.users.cache.find(user => user.id == pf.players[i].id).username} : ${pf.players[i].points}**\n`
          if(count <= (page-1)*pageCount){
            s+= `**------------------------**\n`
          }
        }else if((count > (page-1)*pageCount && count <= page*pageCount)){
          s += `${count}. ${client.users.cache.find(user => user.id == pf.players[i].id).username} : **${pf.players[i].points}**\n`
        }
        count++;
      }
    }
    s+= `**------------------------**\n`

    embed = new Discord.MessageEmbed()
      .setTitle(`**Points Leaderboard**`)
      .setDescription(`${s}`)
      .setColor("#0000FF")
    interaction.reply({embeds: [embed]});
  }
  else if (commandName === 'completewaves'){
    player = interaction.options.getUser('player');
    prefix = interaction.options.getString('prefix');
    wave = interaction.options.getNumber('wave');

    for(var i = 1 ; i <= wave ; i++){
      completeChallenge(player , `${prefix} Wave ${i}` , interaction , false , pf , file)
      //console.log(`Tried to complete \"${prefix} Wave ${i}\" for ${player.username}`)
    }
    interaction.reply(`Succcesfully completed challenges up to wave ${wave}`);
  }
  else if (commandName === 'editchallenge'){
    sortChallenges()
    if(!(interaction.user.id == 293132125190750208 || interaction.user.id == 422184269025247233)){
      interaction.reply('You don\'t have permission to edit challenges');
      return;
    }
    const challengeName = interaction.options.getString("challenge_name");
    const newName = interaction.options.getString("new_name");
    const points = interaction.options.getNumber("points")
    console.log(`Points: ${points}`)

    var pointsDif;
    var challengeFound = false;
    for(var i = 0 ; i < file.challenges.length ; i++){
      if(file.challenges[i].challengeName.toLowerCase() == challengeName.toLowerCase()){
        challengeFound = true;
        if(points != null){
          pointsDif = points - file.challenges[i].points;
          file.challenges[i].points = points;
          console.log(`challenge changed to :${file.challenges[i].points}`);
        }
        if(newName != null){
          file.challenges[i].challengeName = newName;
        }
      }
    }
    console.log(`Pointsdif: ${pointsDif}`)
    var test = false;
    if(challengeFound == true){
      for(var i = 0 ; i < pf.players.length ; i++){
        for(var j = 0 ; j < pf.players[i].challenges.length ; j++){
          if(pf.players[i].challenges[j].challengeName.toLowerCase() == challengeName.toLowerCase()){
            if(points != null){
              pf.players[i].challenges[j].points = points;
              pf.players[i].points += pointsDif;
            }
            if(newName != null){
              pf.players[i].challenges[j].challengeName = newName;
            }
            test = true;
          }
        }
      }
      if(test){
        interaction.reply(`Succesfully edited '${challengeName}'`);
      }else{
        interaction.reply(`Something went wrong`);
      }
    }else{
      interaction.reply(`The challenge'${challengeName}' was not found`);
    }

    fs.writeFile('./challenges.json', JSON.stringify(file , null , 2) , err => {
      if (err) {
        console.error(err)
        //return
      }
    })
    fs.writeFile('./players.json', JSON.stringify(pf , null , 2) , err => {
      if (err) {
        console.error(err)
        //return
      }
    })
  }
  else if (commandName === 'listcodes') {
    const codes = require('./codes.json');

    var s = ''
    for(var i = 0 ; i < codes.codes.length ; i++){
      if(codes.codes[i].codes.length > 0){
        s += `**${codes.codes[0].name}**: Costs ${codes.codes[i].cost} HC, ${codes.codes[i].codes.length} left in stock \n`;
      }
    }
    for(var i = 0 ; i < codes.codes.length ; i++){
      if(codes.codes[i].codes.length == 0){
        s += `**${codes.codes[0].name}**: Costs ${codes.codes[i].cost} HC, *Out of stock* \n`;
      }
    }

    embed = new Discord.MessageEmbed()
      .setTitle('**Codes**')
      .setColor("#91A6A6")
      .setDescription(s)
    interaction.reply({ embeds: [embed] });
  }
  else if (commandName === 'redeemcode') {
    const codeToGet = interaction.options.getString('code_name');

    const codes = require('./codes.json');

    var codeObj;
    var codeIndex;
    for(var i = 0 ; i < codes.codes.length ; i++){
      if(codes.codes[i].name.toLowerCase() == codeToGet.toLowerCase()){
        codeObj = codes.codes[i];
        codeIndex = i;
      }
    }

    var playerHC = 0;
    var playerIndex;
    for(var i = 0 ; i < pf.players.length ; i++){
      if(pf.players[i].id == interaction.user.id){
        playerHC = pf.players[i].points - pf.players[i].pointsSpent;
        playerIndex = i;
      }
    }

    if(codeObj){
      if(codeObj.codes.length > 0){
        if(playerHC >= codeObj.cost){
          try{
            interaction.user.send(`Code for **${codeToGet}**: ${codeObj.codes[0]}`);
            pf.players[playerIndex].pointsSpent += codeObj.cost;
            codes.codes[codeIndex].codes.splice(0,1);
            fs.writeFile('./players.json', JSON.stringify(pf , null , 2) , err => {
              if (err) {
                console.error(err)
                return
              }
            });
            fs.writeFile('./codes.json', JSON.stringify(codes , null , 2) , err => {
              if (err) {
                console.error(err)
                return
              }
            });
            interaction.reply(`Code succesfully redeemed`);
          }catch(error){
            console.log(error)
            interaction.reply(`Something went wrong. Make sure you allow dms from server members by right clicking the server icon, going to Privacy Settings, and allowing direct messages from server members. If this is still causing errors, ping Goldenboi for help`);
          }
        }else{
          interaction.reply(`${codeToGet} costs ${codeObj.cost} HordeCoin but you only have ${playerHC}`);
        }
      }else{
        interaction.reply(`Theres no more **${codeToGet}** left in stock`);
      }
    }else{
      interaction.reply(`There's no code named **${codeToGet}**, try again or use **/listcodes** for help`);
    }
  }
  else if (commandName === 'completespeedrun'){
    time = interaction.options.getNumber('time');
    player = interaction.options.getUser('player')
    times = ["3.15" , "3.00" , "2.40" , "2.30" , "2.20" , "2.10" , "2.06" , "2.03"]

    for(var i = 0 ; i < times.length ; i++){
      if(parseFloat(times[i]) >= time){
        completeChallenge(player , `speedrun ${times[i]}` , interaction , false , pf , file)
      }
    }
    calculateRoles(interaction.user);
    interaction.reply(`Succcesfully completed speedrun challenges up to ${time}`);
  }
  else if (commandName === 'addrrs'){
    channelid = interaction.options.getString('channelid')
    messageid = interaction.options.getString('messageid')
    emojiid = interaction.options.getString('emojiid')
    role = interaction.options.getRole('role')
    var message;
    try{
      message = client.guilds.cache.get(`887891951465140256`).channels.cache.get(channelid).messages.cache.get(messageid)
    }catch(error){
      interaction.reply(`Something is wrong with the channel or message id`)
      return;
    }

    try{
      message.react(emojiid)
    }catch(error){
      interaction.reply(`Something is wrong with the emoji id`)
      return;
    }

    rrs = require(`./rrs`);

    robject = {
      channelid: channelid,
      messageid: messageid,
      emojiid: emojiid,
      role: role
    }

    rrs.rrs.push(robject)
    fs.writeFile('./rrs.json', JSON.stringify(rrs , null , 2) , err => {
      if (err) {
        console.error(err)
        return
      }
    })

    interaction.reply(`Succesfully added reaction role`)
  }
  else if (commandName === 'challengestats'){
    //console.log(client.users.cache)
    challengeToCheck = interaction.options.getString('challenge_name');
    var challengeObj;
    for(var i = 0 ; i < file.challenges.length ; i++){
      if(file.challenges[i].challengeName.toLowerCase() == challengeToCheck.toLowerCase()){
        challengeObj = file.challenges[i];
      }
    }

    if(!challengeObj){
      interaction.reply("Could not find a challenge with that name")
    }else{
      var completeNum = 0;
      var s2 = "";
      for(var i = 0 ; i < pf.players.length ; i++){
        // if(client.users.cache.find(user => user.id == pf.players[i].id))
        //   s2 += `${client.users.cache.find(user => user.id == pf.players[i].id).username}\n`
        for(var j = 0 ; j < pf.players[i].challenges.length ; j++){
          //console.log(`${pf.players[i].challenges[j].challengeName.toLowerCase()}, ${challengeToCheck.toLowerCase()}, ${pf.players[i].challenges[j].challengeName.toLowerCase() == challengeToCheck.toLowerCase()}`)
          if(pf.players[i].challenges[j].challengeName.toLowerCase() == challengeToCheck.toLowerCase()){
            //console.log('Match found!')
            completeNum++;
            if(client.users.cache.find(user => user.id == pf.players[i].id))
              s2 = s2 + `${client.users.cache.find(user => user.id == pf.players[i].id).username}\n`;
          }
        }
      }

      s1 = `**Points gained**: ${challengeObj.points} \n**Completions**: ${completeNum}`

      embedStats = new Discord.MessageEmbed()
        .setTitle(`**Stats for ${challengeObj.challengeName}**`)
        .setColor("#0000FF")
        .setDescription(s1)
      embedCompletions = new Discord.MessageEmbed()
        .setTitle('**Users who\'ve completed this challenge**')
        .setColor("#00FF00")
        .setDescription(s2)
      interaction.reply({ embeds: [embedStats, embedCompletions] });
    }
  }
  else if (commandName === 'challengeleaderboard'){
    sortBy = interaction.options.getString(`sort_by`);
    filter = interaction.options.getString(`filter`);

    challengesList = [];
    for(var k = 0 ; k < file.challenges.length ; k++){
      count = 0;
      for(var i = 0 ; i < pf.players.length ; i++){
        for(var j = 0 ; j < pf.players[i].challenges.length ; j++){
          if(pf.players[i].challenges[j].challengeName.toLowerCase() == file.challenges[k].challengeName.toLowerCase()){
            count++;
            break;
          }
        }
      }
      challengesList.push({
        challengeName: file.challenges[k].challengeName,
        count: count
      })
    }

    function compare(a,b){
      if(sortBy == 'Hardest'){
        if(a.count > b.count){
          return -1;
        }else if(b.count > a.count){
          return 1;
        }
      }else{
        if(a.count > b.count){
          return 1;
        }else if(b.count > a.count){
          return -1;
        }
      }
      return 0;
    }

    challengesList.sort(compare);

    var s = ""
    var count = 1;
    for(var i = 0 ; i < challengesList.length ; i++){
      if(filter && challengesList[i].challengeName.startsWith(filter) || !filter){
        s += `**${count}**. ${challengesList[i].challengeName} : ${challengesList[i].count}\n`;
        count++
      }
    }

    embed = new Discord.MessageEmbed()
      .setTitle(`**Challenges Completions**`)
      .setDescription(`${s}`)
      .setColor("#0000FF")
    interaction.reply({embeds: [embed]});
  }
  else if (commandName === 'randomchallenge'){
    const randomPAmount = ["1", "2", "3", "4"]
    const randomWave = ["11", "16", "21", "26", "29", "34", "40"]
    const randomChallenge = [
      "without using a weapon",
      "using only light attacks",
      "using only heavy attacks",
      "without touching a soft platform",
      "without touching a hard platform",
      "using only ground attacks",
      "using only aerial attacks",
      "using only one unique attack",
      "with the same amount of kills as the other players",
      "without letting either door take damage",
      "while alternating between unarmed and armed for every wave",
      "with a random legend",
      "with one less player than usual",
      "without letting blue demons damage a door",
      "without letting yellow demons damage a door",
      "without letting red demons damage a door",
      "with every player on mobile",
      "while playing magyar"
    ]

    playerCount = randomPAmount[Math.floor(Math.random()*randomPAmount.length)];
    wave = randomWave[Math.floor(Math.random()*randomWave.length)];
    challenge = randomChallenge[Math.floor(Math.random()*randomChallenge.length)];
    interaction.reply(`Reach wave ${wave} with ${playerCount} players ${challenge}`)
  }
  else if (commandName === 'addcombo'){
    name = interaction.options.getString(`name`);
    inputs = interaction.options.getString(`inputs`);
    link = interaction.options.getString(`video_link`);

    var isWeapon = false;
    for(var i = 0; i < weapons.length ; i++){
      if(name.toLowerCase() == weapons[i]){
        isWeapon = true;
      }
    }

    if(legends[name.toLowerCase()] == null && !isWeapon){
      interaction.reply('Invalid legend or weapon name');
      return;
    }
    if(inputs == null && link == null){
      interaction.reply(`Please specify a set of inputs or a video link`);
      return;
    }


    inputs == (inputs != null) ? inputs : "";
    link == (link != null) ? inputs : "";

    combo = {
      name: name.toLowerCase(),
      inputs: inputs,
      link: link
    };

    combos.combos.push(combo);
    fs.writeFile('./combos.json', JSON.stringify(combos , null , 2) , err => {
      if (err) {
        console.error(err)
        return
      }
    });

    interaction.reply('Succesfully added combo')
  }
  else if (commandName === 'listcombo'){
    name = interaction.options.getString(`name`);

    var isWeapon = false;
    for(var i = 0; i < weapons.length ; i++){
      if(name.toLowerCase() == weapons[i]){
        isWeapon = true;
      }
    }

    if(legends[name.toLowerCase()] == null && !isWeapon){
      interaction.reply('Invalid legend or weapon name');
      return;
    }

    function dispCombo(combo, s){
      s += "**------------------------------**\n"
      if(combo.inputs != ""){
        s+= `**${combo.inputs}**\n`
      }
      if(combo.link != ""){
        s+= `${combo.link}\n`
      }
      return s;
    }

    s = ""
    if(legends[name.toLowerCase()] != null){
      for(var i = 0 ; i < combos.combos.length ; i++){
        if(combos.combos[i].name == legends[name.toLowerCase()].name){
          s = dispCombo(combos.combos[i],s);
        }
      }
      for(var i = 0 ; i < combos.combos.length ; i++){
        if(combos.combos[i].name == legends[name.toLowerCase()].weapon1){
          s = dispCombo(combos.combos[i],s);
        }
      }
      for(var i = 0 ; i < combos.combos.length ; i++){
        if(combos.combos[i].name == legends[name.toLowerCase()].weapon2){
          s = dispCombo(combos.combos[i],s);
        }
      }
    }else{
      for(var i = 0 ; i < combos.combos.length ; i++){
        if(combos.combos[i].name == name.toLowerCase()){
          s = dispCombo(combos.combos[i],s);
        }
      }
    }

    if(s == ""){
      s += "**No combos were found for that legend or weapon**"
    }

    interaction.reply(s);
  }
  else if (commandName === 'punish'){
    user = interaction.options.getUser(`user`);
    description = interaction.options.getString(`description`);

    member = await getGuildMember(user);
    thisMember = await getGuildMember(interaction.user);

    if(member.roles.highest != null && thisMember.roles.highest.comparePositionTo(member.roles.highest) <= 0){
      interaction.reply(`You can only punish users below your rank`)
      return;
    }

    var punishNum = 1;
    if(punishments[user.id] == null){
      punishNum == 1;
    }else{
      punishNum = (punishments[user.id] < 0) ? 1 : punishments[user.id] + 1;
    }
    punishments[user.id] = punishNum;

    var s = '';
    var embedPunishment = 'Test';
    const timeouts = [60, 60*24, 60*24*7]

    if(punishNum == 1){
      s = `You've just received your first and only warning in the Demon Slayers Inc server for violating the rules. \n` +
      `Make sure to read over the rules to remind yourself of them and the punishments that follow this one. \n` +
      `**Reason:** \"${description}\"`;
      embedPunishment = `Warning`;
    }
    else if(punishNum < 5){
      member.timeout(timeouts[punishments[user.id] - 2] * 60 * 1000);
      s = `You've been placed in timeout in the Demon Slayers Inc server for violating the rules. \n` +
      `Make sure to read over the rules to remind yourself of them and the punishments that follow this one. \n` +
      `**Reason:** \"${description}\"`;
      embedPunishment = `Timeout`;
    }else{
      s = `You've been banned from the Demon Slayers Inc server for violating the rules too many times. \n` +
      `**Reason:** \"${description}\"`;
      embedPunishment = `Ban`;
    }

    var messageSent = true;
    try{
      user.send(s)
    }catch(error){
      messageSent = false;
    }

    if(messageSent){
      interaction.reply(`Punishment succesfully carried out`)
    }else{
      interaction.reply(`Punishment succesfully carried out, but unable to DM user. \nPlease ensure that this user knows they have been punished`)
    }

    embed = new Discord.MessageEmbed()
      .setTitle(`**${thisMember.displayName} has punished ${member.displayName}**`)
      .setColor("#FF0000")
      .setDescription(`**Reason:** ${description}`)
      .addFields(
    		{ name: 'New Punishment Number', value: `${punishNum}`, inline: true },
    		{ name: 'Punishment', value: `${embedPunishment}`, inline: true },
    	)
      .setThumbnail(member.avatarURL())

    if(punishNum >= 5){
      member.ban();
    }

    fs.writeFile('./punishments.json', JSON.stringify(punishments , null , 2) , err => {
      if (err) {
        console.error(err)
        return
      }
    });

    client.guilds.cache.get(`887891951465140256`).channels.cache.get('953723070747664444').send({ embeds: [embed] });
  }
  else if (commandName === 'unpunish'){
    user = interaction.options.getUser(`user`);
    description = interaction.options.getString(`description`);
    member = await getGuildMember(user);
    thisMember = await getGuildMember(interaction.user);


    if(member.roles.highest != null && thisMember.roles.highest.comparePositionTo(member.roles.highest) <= 0){
      interaction.reply(`You can only unpunish users below your rank`)
      return;
    }
    var punishNum = 1;
    if(punishments[user.id] == null || punishments[user.id] <= 0){
      interaction.reply(`This user has no punishments`)
      return;
    }else{
      punishments[user.id]--;
    }
    fs.writeFile('./punishments.json', JSON.stringify(punishments , null , 2) , err => {
      if (err) {
        console.error(err)
        return
      }
    });


    var messageSent = true;
    try{
      user.send(`One of your punishments in Demon Slayers Inc has been taken back \n**Reason:** ${description} \n**New Punishment Count:** ${punishments[user.id]}`)
    }catch(error){
      messageSent = false;
    }
    if(messageSent){
      interaction.reply(`Punishment succesfully removed`)
    }else{
      interaction.reply(`Punishment succesfully removed, but unable to DM user. \nPlease ensure that this user knows they have been unpunished`)
    }

    embed = new Discord.MessageEmbed()
      .setTitle(`**${thisMember.displayName} has removed a punishment from ${member.displayName}**`)
      .setColor("#00FF00")
      .setDescription(`**Reason:** ${description}`)
      .addFields(
    		{ name: 'New Punishment Number', value: `${punishments[user.id]}`, inline: true },
    	)
      .setThumbnail(member.avatarURL())

    client.guilds.cache.get(`887891951465140256`).channels.cache.get('953723070747664444').send({ embeds: [embed] });
  }
  else if (commandName === 'listpunishments'){
    user = interaction.options.getString(`user`);
    //I haven't actually implemented this yet
    //You saw nothing
  }

  calculateRoles(interaction.user);
});

//Reaction Roles start -----------------------------------------------------------------------------
client.on('messageReactionAdd', (messageReaction, user) => {
  if(user.id == '923650944867119105'){
    return;
  }
  const rrs = require('./rrs');
  //console.log(`Reaction received: ${messageReaction.message.id}, ${messageReaction.emoji.id}`)
  //console.log(`${messageReaction.message.id == rrs.rrs[0].id}, ${messageReaction.emoji.id == rrs.rrs[0].id}`)
  //console.log(`${messageReaction.message.id}, ${messageReaction.emoji.id} -----`)
  for(var i = 0 ; i < rrs.rrs.length ; i++){
    //console.log(`${rrs.rrs[i].messageid}, ${rrs.rrs[i].emojiid}`)
    if(messageReaction.message.id == rrs.rrs[i].messageid && messageReaction.emoji.id == rrs.rrs[i].emojiid){
      //console.log(`Shouldve given ${user.username} the role: ${rrs.rrs[i].role}`)
      messageReaction.message.guild.roles.fetch()
      id = rrs.rrs[i].role.id
      try{
        messageReaction.message.guild.members.fetch(user.id).then(member => {
          member.roles.add(id);
        })
      }catch(error){

      }
    }
  }
});

client.on('messageReactionRemove', (messageReaction, user) => {
  const rrs = require('./rrs');
  //console.log(`Reaction received: ${messageReaction.message.id}, ${messageReaction.emoji.id}`)
  //console.log(`${messageReaction.message.id == rrs.rrs[0].id}, ${messageReaction.emoji.id == rrs.rrs[0].id}`)
  //console.log(rrs.rrs.length)
  for(var i = 0 ; i < rrs.rrs.length ; i++){
    if(messageReaction.message.id == rrs.rrs[i].messageid && messageReaction.emoji.id == rrs.rrs[i].emojiid){
      //console.log(`Shouldve given ${user.username} the role: ${rrs.rrs[i].role}`)
      messageReaction.message.guild.roles.fetch()
      id = rrs.rrs[i].role.id
      try{
        messageReaction.message.guild.members.fetch(user.id).then(member => {
          member.roles.remove(id);
        })
      }catch(error){

      }
    }
  }
});
//Reaction Roles end -------------------------------------------------------------------------------

//Challenges start ---------------------------------------------------------------------------------
client.on('messageReactionAdd', async (messageReaction, user) => {
  if(user.id == '923650944867119105'){
    return;
  }
  file = require('./challenges.json')
  pf = require('./players.json')

  playerIndex = -1;

  for(var i = 0 ; i < pf.players.length ; i++){
    if(pf.players[i].id == user.id){
      playerIndex = i;
    }
  }
  if(playerIndex == -1){
    for(var i = 0 ; i < file.challenges.length ; i++){
      if(messageReaction.message.id == file.challenges[i].messageId && messageReaction.emoji.name == '✅'){
        client.guilds.cache.get(`887891951465140256`).channels.cache.get('925055051473510411').send(`${user} completed \'${file.challenges[i].challengeName}\' through reactions`);
        completeChallenge(user, file.challenges[i].challengeName, null, false, pf, file);
        calculateRoles(user)
        return;
      }
}
  }
  for(var i = 0 ; i < file.challenges.length ; i++){
    if(messageReaction.message.id == file.challenges[i].messageId && messageReaction.emoji.name == '✅'){
      console.log('Reaction Add found');
      challengeAlreadyCompleted = false;
      for(var j = 0 ; j < pf.players[playerIndex].challenges.length ; j++){
        if(pf.players[playerIndex].challenges[j].challengeName.toLowerCase() == file.challenges[i].challengeName.toLowerCase()){
          challengeAlreadyCompleted = true;
        }
      }
      if(!challengeAlreadyCompleted){
        client.guilds.cache.get(`887891951465140256`).channels.cache.get('925055051473510411').send(`${user} completed \'${file.challenges[i].challengeName}\' through reactions`);
      }
      completeChallenge(user, file.challenges[i].challengeName, null, false, pf, file);
    }
  }

  calculateRoles(user)
});

client.on('messageReactionRemove', async (messageReaction, user) => {
  file = require('./challenges.json')
  pf = require('./players.json')

  playerIndex = -1;

  for(var i = 0 ; i < pf.players.length ; i++){
    if(pf.players[i].id == user.id){
      playerIndex = i;
    }
  }

  if(playerIndex == -1){
    client.guilds.cache.get(`887891951465140256`).channels.cache.get('925055051473510411').send(`${user} decompleted \'${file.challenges[i].challengeName}\' through reactions`);
    decompleteChallenge(user, file.challenges[i].challengeName, null, false, pf, file);
    calculateRoles(user)
    return;
  }

  for(var i = 0 ; i < file.challenges.length ; i++){
    if(messageReaction.message.id == file.challenges[i].messageId && messageReaction.emoji.name == '✅'){
      console.log('Reaction Remove found');
      challengeAlreadyCompleted = false;
      for(var j = 0 ; j < pf.players[playerIndex].challenges.length ; j++){
        if(pf.players[playerIndex].challenges[j].challengeName.toLowerCase() == file.challenges[i].challengeName.toLowerCase()){
          challengeAlreadyCompleted = true;
        }
      }
      if(challengeAlreadyCompleted){
        client.guilds.cache.get(`887891951465140256`).channels.cache.get('925055051473510411').send(`${user} decompleted \'${file.challenges[i].challengeName}\' through reactions`);
      }
      decompleteChallenge(user, file.challenges[i].challengeName, null, false, pf, file);
    }
  }

  calculateRoles(user)
});
//Challenges end -----------------------------------------------------------------------------------

//Welcome message start
client.on('guildMemberAdd', async member => {
    if(member.guild.id != `887891951465140256`){
      return;
    }
    await member.guild.channels.cache.get('887891952022994954').send(`${member.user} Welcome to Brawlhalla's unofficial Horde server! \n` +
    `Make sure to check out <#914325553643921419> and <#933551651795644439> and have a good time!\n` +
    `We have various challenges for competitive players in the Challenges category, you can read more about them in <#914326106763575376>`);
});
//Welcome message end

client.login(token);

async function getGuildMember(user){
  return client.guilds.cache.get('887891951465140256').members.fetch(user.id);
}

//Completes a challenge for a player
function completeChallenge(player, challengeToComplete , interaction , shouldReply , pf , file){
  if(player.id == '923650944867119105'){
    if(!shouldReply){
      return;
    }
  }
  var challengeObj;
  for(var i = 0 ; i < file.challenges.length ; i++){
    if(file.challenges[i].challengeName.toLowerCase() == challengeToComplete.toLowerCase()){
      challengeObj = file.challenges[i]
    }
  }
  if(challengeObj){
    var boolTemp2 = false;
    for(var i = 0 ; i < pf.players.length ; i++){
      if(pf.players[i].id == player.id){
        boolTemp2 = true;
        var boolTemp = false;
        for(var j = 0 ; j < pf.players[i].challenges.length ; j++){
          if(pf.players[i].challenges[j].challengeName.toLowerCase() == challengeToComplete.toLowerCase()){
            boolTemp = true;
          }
        }

        if(boolTemp){
          if(shouldReply)
            interaction.reply(`${player.username} has already completed that challenge`);
        }else{
          pf.players[i].challenges.push(challengeObj)
          pf.players[i].points += challengeObj.points;
          fs.writeFile('./players.json', JSON.stringify(pf , null , 2) , err => {
            if (err) {
              console.error(err)
              return
            }
          })
          if(shouldReply)
            interaction.reply(`Challenge succesfully completed`);
        }
        break;
      }
    }
    if(!boolTemp2){
      newObj = {
        id: player.id,
        points: challengeObj.points,
        challenges: [challengeObj],
        pointsSpent: 0
      }
      pf.players.push(newObj)
      fs.writeFile('./players.json', JSON.stringify(pf , null , 2) , err => {
        if (err) {
          console.error(err)
          return
        }
      })
      if(shouldReply)
        interaction.reply(`Challenge succesfully completed`);
    }
  }else if(shouldReply){
    interaction.reply('That challenge doesn\'t exist, **/listchallenges** could help')
  }
  calculateRoles(player)
}

//Removes a completed challenge from a player
function decompleteChallenge(player, challengeToDecomplete, interaction, shouldReply , pf , file){
  var challengeObj;
  for(var i = 0 ; i < file.challenges.length ; i++){
    if(file.challenges[i].challengeName.toLowerCase() == challengeToDecomplete.toLowerCase()){
      challengeObj = file.challenges[i]
    }
  }

  if(challengeObj){
    var bool1 = false;
    for(var i = 0 ; i < pf.players.length ; i++){
      if(pf.players[i].id == player.id){
        bool1 = true;
        var boolTemp = false;
        var index = -1;
        for(var j = 0 ; j < pf.players[i].challenges.length ; j++){
          if(pf.players[i].challenges[j].challengeName.toLowerCase() == challengeToDecomplete.toLowerCase()){
            boolTemp = true;
            index = j;
          }
        }
        //console.log(`${interaction.user.username} used decompletechallenge (found a player)`);
        if(!boolTemp){
          if(shouldReply){
            interaction.reply(`${player.username} has not completed that challenge`);
          }
        }else{
          pf.players[i].challenges.splice(index, 1)
          pf.players[i].points -= challengeObj.points;
          fs.writeFile('./players.json', JSON.stringify(pf , null , 2) , err => {
            if (err) {
              console.error(err)
              return
            }
          })
          if(shouldReply){
            interaction.reply(`Challenge succesfully decompleted`);
          }
        }
        break;
      }
    }
    if(!bool1){
      if(shouldReply){
        interaction.reply(`${player.username} has not completed that challenge`);
      }
    }
  }else{
    if(shouldReply){
      interaction.reply('That challenge doesn\'t exist');
    }
  }
  calculateRoles(player)
}

//Makes sure each player only has one unique completion of each challenge
function ensureDuplicates(){
  const pf = require('./players.json')
  for(var i = 0 ; i < pf.players.length ; i++){
    var challenges = [];
    for(var j = 0 ; j < pf.players[i].challenges.length ; j++){
      if(challenges.includes(pf.players[i].challenges[j].challengeName)){
        pf.players[i].challenges.splice(j,1);
        j--;
      }else{
        challenges.push(pf.players[i].challenges[j].challengeName)
      }
    }
  }
  fs.writeFile('./players.json', JSON.stringify(pf , null , 2) , err => {
    if (err) {
      console.error(err)
      return
    }
  })
}

//Makes sure each players' total points are in line with the sum of the points of their challenges
function recalculatePoints(){
  const pf = require('./players.json')
  for(var i = 0 ; i < pf.players.length ; i++){
    pf.players[i].points = 0;
    for(var j = 0 ; j < pf.players[i].challenges.length ; j++){
      pf.players[i].points += pf.players[i].challenges[j].points;
    }
  }
  fs.writeFile('./players.json', JSON.stringify(pf , null , 2) , err => {
    if (err) {
      console.error(err)
      return
    }
  })
}

// Sorts the challenge file in first based on player amount, then difficulty
function sortChallenges(){
  const file = require('./challenges.json')

  function compare(a,b){
    a1 = parseInt(a.challengeName.charAt(0))
    b1 = parseInt(b.challengeName.charAt(0))
    if(a1){
      if(b1){
        if(a1 < b1){
          return -1
        }
        if(b1 < a1){
          return 1
        }
        if(a.points < b.points){
          return -1
        }
        return 1
      }
      return -1
    }
    if(b1){
      return 1;
    }
    if(a.points < b.points){
      return -1
    }
    return 1
  }

  file.challenges.sort(compare)
  fs.writeFile('./challenges.json', JSON.stringify(file , null , 2) , err => {
    if (err) {
      console.error(err)
      return
    }
  })
}

// Updates challenge reactions (only really used when the bot goes down for long periods of time)
async function calculateReactions(){
  file = require('./challenges.json');
  pf = require('./players.json')

  var errors = 0;
  // var message1 = await client.guilds.cache.get(`887891951465140256`)
  //   .channels.cache.get(file.challenges[0].channelId)
  //   .messages.cache.get(file.challenges[0].messageId)
  // console.log(`${message1}`)
  var reactionCount = 0;
  var userCount = 0;
  for(var i = 0 ; i < file.challenges.length ; i++){
    try{
      message = await client.guilds.cache.get(`887891951465140256`)
        .channels.cache.get(file.challenges[i].channelId)
        .messages.cache.get(file.challenges[i].messageId);
      reactions = await message.reactions.resolve('✅').users.fetch()
      for(let [id, messageReaction] of message.reactions.cache){
        reactionCount++;
        if(messageReaction.emoji.name == '✅'){
          for(let [userid, user] of messageReaction.users.cache){
            userCount++;
            if(user.id  != '293132125190750208')
              completeChallenge(user, file.challenges[i].challengeName , null , false , pf, file);
          }
        }
      }
    }catch(error){
      errors++;
      console.log(error)
    }
  }
  console.log(`Found ${reactionCount} reactions with ${userCount} users`)
  console.log(`Out of ${file.challenges.length} challenges, ${errors} errors occurred`)
}

// Calculates the roles of a player based off of the challenges they've completed
// Only does it for the Tin through Master roles, not VIP
async function calculateRoles(player){
  const pf = require('./players.json');
  const file = require('./challenges.json');
  member = await client.guilds.cache.get(`887891951465140256`).members.fetch(player.id);
  horde = client.guilds.cache.get(`887891951465140256`)

  playerIndex = -1;
  for(var i = 0 ; i < pf.players.length ; i++){
    if(pf.players[i].id == player.id){
      playerIndex = i;
      break;
    }
  }

  const roleOrder = ["Tin", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Professional", "Master"]
  const slayerChallenges = [
    "2p Wave 9",
    "2p Wave 13",
    "2p Wave 18",
    "2p Wave 26",
    "2p Wave 29",
    "2p Wave 34",
    "2p Wave 40",
    "2p Wave 50"
  ]
  const soloChallenges = [
    "1p Wave 6",
    "1p Wave 8",
    "1p Wave 13",
    "1p Wave 16",
    "1p Wave 18",
    "1p Wave 21",
    "1p Wave 24",
    "1p Wave 26"
  ]
  const speedrunChallenges = [
    "speedrun 3.15",
    "speedrun 3.00",
    "speedrun 2.40",
    "speedrun 2.30",
    "speedrun 2.20",
    "speedrun 2.10",
    "speedrun 2.06",
    "speedrun 2.03"
  ]


  if(playerIndex == -1){
    for(var i = 0 ; i < roleOrder.length ; i++){
      for(let [id, role] of member.roles.cache){
        if(role.name.toLowerCase() == `${roleOrder[i]} Slayer`.toLowerCase()){
          member.roles.remove(role);
        }
      }
    }
    for(var i = 0 ; i < roleOrder.length ; i++){
      for(let [id, role] of member.roles.cache){
        if(role.name.toLowerCase() == `${roleOrder[i]} Soloist`.toLowerCase()){
          member.roles.remove(role);
        }
      }
    }
    for(var i = 0 ; i < roleOrder.length ; i++){
      for(let [id, role] of member.roles.cache){
        if(role.name.toLowerCase() == `${roleOrder[i]} Speedrunner`.toLowerCase()){
          member.roles.remove(role);
        }
      }
    }
    return;
  }


  highestSlayerRole = -1;
  var roleRemove1;
  var highestRole1;
  highestSlayerChallenge = -1;
  for(var i = 0 ; i < roleOrder.length ; i++){
    for(let [id, role] of member.roles.cache){
      if(role.name.toLowerCase() == `${roleOrder[i]} Slayer`.toLowerCase()){
        highestSlayerRole = i;
        roleRemove1 = role;
      }
    }
    for(var j = 0 ; j < pf.players[playerIndex].challenges.length ; j++){
      if(pf.players[playerIndex].challenges[j].challengeName == slayerChallenges[i]){
        highestSlayerChallenge = i;
      }
    }
  }
  if(highestSlayerChallenge >= 0 && !member.roles.cache.find(r => r.name == `${roleOrder[highestSlayerChallenge]} Slayer`)){
    member.roles.add(horde.roles.cache.find(r => r.name == `${roleOrder[highestSlayerChallenge]} Slayer`));
  }
  for(var i = 0 ; i < roleOrder.length ; i++){
    if(i != highestSlayerChallenge){
      for(let [id, role] of member.roles.cache){
        if(role.name == `${roleOrder[i]} Slayer`){
          member.roles.remove(role)
        }
      }
    }
  }


  highestSoloRole = -1;
  var roleRemove2;
  var highestRole2;
  highestSoloChallenge = -1;
  for(var i = 0 ; i < roleOrder.length ; i++){
    for(let [id, role] of member.roles.cache){
      if(role.name.toLowerCase() == `${roleOrder[i]} Soloist`.toLowerCase()){
        highestSoloistRole = i;
        roleRemove2 = role;
      }
    }
    for(var j = 0 ; j < pf.players[playerIndex].challenges.length ; j++){
      if(i < soloChallenges.length && pf.players[playerIndex].challenges[j].challengeName == soloChallenges[i]){
        highestSoloChallenge = i;
      }
    }
  }
  if(highestSoloChallenge >= 0 && !member.roles.cache.find(r => r.name == `${roleOrder[highestSoloChallenge]} Soloist`)){
    member.roles.add(horde.roles.cache.find(r => r.name == `${roleOrder[highestSoloChallenge]} Soloist`));
  }
  for(var i = 0 ; i < roleOrder.length ; i++){
    if(i != highestSoloChallenge){
      for(let [id, role] of member.roles.cache){
        if(role.name == `${roleOrder[i]} Soloist`){
          member.roles.remove(role)
        }
      }
    }
  }


  highestSpeedrunRole = -1;
  var roleRemove3;
  var highestRole3;
  highestSpeedrunChallenge = -1;
  for(var i = 0 ; i < roleOrder.length ; i++){
    for(let [id, role] of member.roles.cache){
      if(role.name.toLowerCase() == `${roleOrder[i]} Speedrunner`.toLowerCase()){
        highestSpeedrunRole = i;
        roleRemove3 = role;
      }
    }
    for(var j = 0 ; j < pf.players[playerIndex].challenges.length ; j++){
      if(i < speedrunChallenges.length && pf.players[playerIndex].challenges[j].challengeName == speedrunChallenges[i]){
        highestSpeedrunChallenge = i;
      }
    }
  }
  if(highestSpeedrunChallenge >= 0 && !member.roles.cache.find(r => r.name == `${roleOrder[highestSpeedrunChallenge]} Speedrunner`)){
    member.roles.add(horde.roles.cache.find(r => r.name == `${roleOrder[highestSpeedrunChallenge]} Speedrunner`));
  }
  for(var i = 0 ; i < roleOrder.length ; i++){
    if(i != highestSpeedrunChallenge){
      for(let [id, role] of member.roles.cache){
        if(role.name == `${roleOrder[i]} Speedrunner`){
          member.roles.remove(role)
        }
      }
    }
  }
}

//Writes the permissions of specific commands for specific roles/people
function writePermissions(){
  const owners = [
    '534806520232280068', //Anis
    '422184269025247233'  //Goldenboi
  ];
  const mods = [
    '914379597045444618', //Admin
    '914380509797290044'  //Mod
  ];
  const ownerCommands = [
    '925056385639645255', //addchallenge
    '925484398663573535', //editchallenge
    '933397265551347732'  //addrrs
  ];
  const modCommands = [
    '954391975237390336', //addcombo
    '955599847061327942', //punish
    '955599847061327943', //unpunish
    '955599847061327944'  //listpunishments
  ];

  perms = [];

  for(const command of ownerCommands){
    commObj = {
      id: command, //addchallenge
  		permissions: []
    }
    for(const owner of owners){
      permObj = {
        id: owner,
        type: 'USER',
        permission: true
      }
      commObj.permissions.push(permObj);
    }
    perms.push(commObj);
  }

  for(const command of modCommands){
    commObj = {
      id: command, //addchallenge
  		permissions: []
    }
    for(const owner of owners){
      permObj = {
        id: owner,
        type: 'USER',
        permission: true
      }
      commObj.permissions.push(permObj);
    }
    for(const modRole of mods){
      permObj = {
        id: modRole,
        type: 'ROLE',
        permission: true
      }
      commObj.permissions.push(permObj);
    }
    perms.push(commObj);
  }
  //console.log(perms[0].permissions[0].id);
  client.guilds.cache.get(guildId)?.commands.permissions.set({ fullPermissions : perms });
}
