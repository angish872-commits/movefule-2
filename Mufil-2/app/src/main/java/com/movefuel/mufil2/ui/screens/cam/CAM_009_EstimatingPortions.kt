package com.movefuel.mufil2.ui.screens.cam

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAM009EstimatingPortionsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAM_009",
        title = "Estimating Portions",
        subtitle = "Food photo and gallery analysis with explicit review.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAM_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAM_008,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Captured meal", "Image remains visible while analysis continues.")
            MFStageList(listOf("Checking image","Detecting foods","Estimating portions","Matching nutrition","Preparing review"), 2)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAM009EstimatingPortionsScreenPreview() {
    MoveFuelTheme { CAM009EstimatingPortionsScreen {} }
}
