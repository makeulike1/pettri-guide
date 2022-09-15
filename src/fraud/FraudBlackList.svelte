<script>
    import FraudBlackListIP 	 from "./FraudBlackListIP.svelte"    
    import FraudBlackListPub 	 from "./FraudBlackListPub.svelte"    


    function showfbIP(){
      window.$('#fraud-black-list-ip').show()
      window.$('#fraud-black-list-pub').hide()
      window.$('#dropdown-1').text('IP 주소')

    }

    function showfbPub(){
      window.$('#fraud-black-list-ip').hide()
      window.$('#fraud-black-list-pub').show()
      window.$('#dropdown-1').text('퍼블리셔 ID')
    }

</script>

<div class="dropdown">
    <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdown-1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">퍼블리셔 ID</button>
    <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
        <!-- svelte-ignore a11y-invalid-attribute -->
      <a class="dropdown-item" href="#" on:click={showfbPub}>퍼블리셔 ID</a>
      <!-- svelte-ignore a11y-invalid-attribute -->
      <a class="dropdown-item" href="#" on:click={showfbIP}>IP 주소</a>
    </div>
</div>


<div id='fraud-black-list-ip' class='cont-2 hidden'>
  <FraudBlackListIP/>
</div>
<div id='fraud-black-list-pub' class='cont-2'>
  <FraudBlackListPub/>
</div>
