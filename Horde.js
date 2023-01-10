const { clientId, guildId, token} = require('./config.json');
const Discord = require('discord.js');
const fs = require('fs');
const client = new Discord.Client({ intents: [
  "GUILDS" ,
  "GUILD_MEMBERS" ,
  "GUILD_INTEGRATIONS" ,
  "GUILD_MESSAGES" ,
  "GUILD_MESSAGE_REACTIONS"] });

  const fullPermissions = [
  	{
  		id: '925056385639645255', //addchallenge
  		permissions: [{
  			id: '293132125190750208', //Heck-it
  			type: 'USER',
  			permission: true,
  		},
      {
        id: '422184269025247233', //me
        type: 'USER',
        permission: true,
      }],
  	},
  	{
  		id: '925484398663573535', //editchallenge
  		permissions: [{
  			id: '293132125190750208', //Heck-it
  			type: 'USER',
  			permission: true,
  		},
      {
        id: '422184269025247233', //me
        type: 'USER',
        permission: true,
      }],
  	},
    {
      id: '925056385639645258', //decompletechallenge
      permissions: [
        {
    			id: '293132125190750208', //Heck-it
    			type: 'USER',
    			permission: true,
    		},
        {
          id: '422184269025247233', //me
          type: 'USER',
          permission: true,
        }
      ]
    },
  ];

client.once('ready', () => {
  client.guilds.cache.get(guildId)?.commands.permissions.set({ fullPermissions });

	console.log('Ready!');
  const pf = require('./players.json');

  for(var i = 0 ; i < pf.players.length ; i++){
    client.users.fetch(pf.players[i].id);
  }

  ensureDuplicates();
  recalculatePoints();
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

  console.log(`${interaction.commandName}:${interaction.commandId}`);

	const { commandName } = interaction;
  const file = require('./challenges.json');
  const pf = require('./players.json');

	if (commandName === 'addchallenge') {
    const challengeName = interaction.options.getString("challenge_name");
    const points = interaction.options.getNumber("points")

    const output = {
      challengeName : challengeName ,
      points : points
    }
    file.challenges.push(output);
    fs.writeFile('./challenges.json', JSON.stringify(file , null , 2) , err => {
      if (err) {
        console.error(err)
        return
      }
    })

    await interaction.reply(`Added '${challengeName}'`);

	}
  else if (commandName === 'listchallenges') {
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
          console.log(`${interaction.user.username} used decompletechallenge (found a player)`);
          if(!boolTemp){
            interaction.reply(`${player.username} has not completed that challenge`);
          }else{
            pf.players[i].challenges.splice(index, 1)
            pf.players[i].points -= challengeObj.points;
            fs.writeFile('./players.json', JSON.stringify(pf , null , 2) , err => {
              if (err) {
                console.error(err)
                return
              }
            })
            interaction.reply(`Challenge succesfully decompleted`);
          }
          break;
        }
      }
      if(!bool1){
        interaction.reply(`${player.username} has not completed that challenge`);
      }
    }else{
      interaction.reply('That challenge doesn\'t exist');
    }
  }
  else if (commandName === 'playerstats'){
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
    embedComplete = new Discord.MessageEmbed()
      .setTitle('**Completed Challenges**')
      .setColor("#00FF00")
      .setDescription(s1)
    embedIncomplete = new Discord.MessageEmbed()
      .setTitle('**Incompleted Challenges**')
      .setColor("#FF0000")
      .setDescription(s2)

    interaction.reply({ embeds: [embedPoints , embedComplete , embedIncomplete] });
  }
  else if (commandName === 'leaderboard'){

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
    var s = `1. ${client.users.cache.find(user => user.id == pf.players[0].id).username} : **${pf.players[0].points}**`
    for(var i = 1 ; i < pf.players.length ; i++){
      s += `\n${i+1}. ${client.users.cache.find(user => user.id == pf.players[i].id).username} : **${pf.players[i].points}**`
    }
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
      completeChallenge(player , `${prefix} Wave ${wave}` , interaction , false , pf , file)
    }
    interaction.reply(`Succcesfully completed challenges up to wave ${wave}`);
  }
  else if (commandName === 'editchallenge'){
    if(!(interaction.user.id == 293132125190750208 || interaction.user.id == 422184269025247233)){
      interaction.reply('You don\'t have permission to edit challenges');
      return;
    }
    const challengeName = interaction.options.getString("challenge_name");
    const points = interaction.options.getNumber("points")

    var pointsDif;
    for(var i = 0 ; i < file.challenges.length ; i++){
      if(file.challenges[i].challengeName.toLowerCase() == challengeName.toLowerCase()){
        pointsDif = points - file.challenges[i].points;
        file.challenges[i].points = points;
      }
    }

    if(pointsDif){
      for(var i = 0 ; i < pf.players.length ; i++){
        for(var j = 0 ; j < pf.players[i].challenges.length ; j++){
          if(pf.players[i].challenges[j].challengeName.toLowerCase() == challengeName.toLowerCase()){
            pf.players[i].challenges[j].points = points;
            pf.players[i].points += pointsDif;
            break;
          }
        }
      }
      interaction.reply(`Succesfully edited '${challengeName}'`);
    }else{
      interaction.reply(`The challenge'${challengeName}' was not found`);
    }

    fs.writeFile('./challenges.json', JSON.stringify(file , null , 2) , err => {
      if (err) {
        console.error(err)
        return
      }
    })
    fs.writeFile('./players.json', JSON.stringify(pf , null , 2) , err => {
      if (err) {
        console.error(err)
        return
      }
    })
  }
  else if (commandName === 'listcodes') {
    const codes = require('./codes.json');

    for(var i = 0 ; i < codes.codes.length ; i++){
      if(codes.codes[i].codes.length > 0){
        s = `**${codes.codes[0].name}**: Costs ${codes.codes[i].cost} HC, ${codes.codes[i].codes.length} left in stock \n`;
      }
    }
    for(var i = 0 ; i < codes.codes.length ; i++){
      if(codes.codes[i].codes.length == 0){
        s = `**${codes.codes[0].name}**: Costs ${codes.codes[i].cost} HC, *Out of stock* \n`;
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
    interaction.reply(`Succcesfully completed speedrun challenges up to ${time}`);
  }
});

client.login(token);

function completeChallenge(player, challengeToComplete , interaction , shouldReply , pf , file){
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
}

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
