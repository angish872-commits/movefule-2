package com.movefuel.mufil2.ui.screens.sor

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SOR010PainSafetyRouteScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SOR_010",
        title = "Pain Safety Route",
        subtitle = "Soreness body-map workflow; pain stays separate.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RDY_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SOR_009,
        onNavigate = onNavigate,
    ) {
            MFNotice("This sounds like pain","Pain uses a separate safety route and is not auto-cleared like soreness.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SOR010PainSafetyRouteScreenPreview() {
    MoveFuelTheme { SOR010PainSafetyRouteScreen {} }
}
